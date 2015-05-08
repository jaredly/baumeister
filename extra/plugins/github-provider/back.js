
// import passport from 'passport'
// import {Strategy} from 'passport-github'

import github from 'github'
import simpleOauth2 from 'simple-oauth2'

import getRepos from './get-repos'

const GITHUB_CLIENT_ID = 'f0a7b9f6317c8dcc184d'
const GITHUB_CLIENT_SECRET = '148bc9db7871e79f54eef5c55f382f9d6782c096'

export default class GithubProvider {
  constructor(config, manager) {
    this.manager = manager
    this.config = config || {}

    this.setupAuth()
  }

  onConfig(config) {
    console.log('got config', config)
    this.config = config
  }

  setupAuth() {
    const oauth2 = simpleOauth2({
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      site: 'https://github.com/login',
      tokenPath: '/oauth/access_token'
    })

    const app = this.manager.app

    const cb_uri = app.url('/auth/callback')

    // Authorization uri definition 
    var authorization_uri = oauth2.authCode.authorizeURL({
      redirect_uri: cb_uri,
      scope: 'repo, write:repo-hook',
      state: '3(#0/!~'
    });

    app.get('/auth', (req, res) => {
      res.redirect(authorization_uri);
    });

    app.get('/auth/callback', (req, res) => {
      var code = req.query.code;
      oauth2.authCode.getToken({
        code: code,
        redirect_uri: cb_uri,
      }, (err, result) => {
        if (err) {
          console.log('Access Token Error', err.message);
          return res.end(500, 'Failure...')
        }

        this.manager.setConfig({
          token: result.access_token,
        }).then(() => res.redirect('http://localhost:3000/#/config'))
      })
    });

    app.get('/repos/refresh', (req, res) => {
      getRepos(this.config.token)
        .then(items => {
          res.send(items)
          return this.manager.setCache({token: this.config.token, items})
        }, error => {
          console.log(error)
          res.end(500, 'failed to do things')
        })
    })

    app.get('/repos', (req, res) => {
      this.manager.getCache().then(cache => {
        if (cache && cache.token === this.config.token) return res.send(cache.items)
        getRepos(this.config.token)
          .then(items => {
            res.send(items)
            return this.manager.setCache({token: this.config.token, items})
          }, error => {
            console.log(error)
            res.end(500, 'failed to do things')
          })
      })
    })
  }

  onBuild(project, build, onStep, config) {
    if (!config.repo) {
      throw new ConfigError('No githuhb repo selected', 'gtihub-provider', 'Go to config and select a repository to use.')
    }
    if (build.trigger && build.trigger.info.sha) {
      onStep('init', (builder, ctx, io) => {
        io.emit('info', 'Notifying github of pending build')
        return sendStatus('pending', {
          repo: config.repo,
          sha: build.trigger.info.sha,
          projectId: project.id,
          buildId: build.id,
        })
      })
    }

    onStep('getproject', (builder, ctx, io) => {
      return builder.runCached({
        docker: {
          image: 'docker-ci/git',
        },
        env: ['GIT_TERMINAL_PROMPT=0'],
      }, {
        get: {
          cmd: `git init && git pull https://${this.config.token}@github.com/${config.repo}`,
          cleanCmd: `git init && git pull https://[token]@github.com/${config.repo}`
        },
        update: {
          cmd: `git pull https://${this.config.token}@github.com/${config.repo}`,
          cleanCmd: `git pull https://[token]@github.com/${config.repo}`
        },
        cachePath: 'project',
        projectPath: '.',
      })
      .then(() => {
        if (build.trigger && build.trigger.info.sha) return
        return builder.run('git rev-parse HEAD', {
          docker: {
            image: 'docker-ci/git',
          },
          env: ['GIT_TERMINAL_PROMPT=0'],
        }, {
          silent: true,
        }).then(({out, code}) => {
          console.log('got', out)
          return sendStatus('pending', {
            repo: config.repo,
            sha: out.trim(),
            projectId: project.id,
            buildId: build.id,
          })
        })
      })
    })
  }
}

function sendStatus(status, {repo, sha, projectId, buildId}) {
  return prom(done =>
    superagent.post(`https://api.github.com/repos${repo}/statuses/${sha}`)
      .send({
        state: 'pending',
        target_url: `http://localhost:3000/#/${projectId}/${buildId}`,
      })
      .end((err, res) => {
        done(err)
      }))
}

