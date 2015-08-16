
// import passport from 'passport'
// import {Strategy} from 'passport-github'

import github from 'github'
import simpleOauth2 from 'simple-oauth2'
import superagent from 'superagent'
import prom from '../../../lib/prom'

import getRepos from './get-repos'

const GITHUB_CLIENT_ID = 'f0a7b9f6317c8dcc184d'
const GITHUB_CLIENT_SECRET = '148bc9db7871e79f54eef5c55f382f9d6782c096'

export default class GithubProvider {
  constructor(config, manager) {
    this.manager = manager
    this.config = config || {}

    this.projectsByRepo = {}

    this.setupAuth()
  }

  onConfig(config) {
    console.log('got config', config)
    this.config = config
  }

  onProject(project, config) {
    this.projectsByRepo[config.repo] = project.id
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

    app.post('/hook', (req, res) => {
      const event = req.headers['x-github-event']
      console.log('hook', event)
      const body = req.body

      const repo = body.repository.full_name
      if (!this.projectsByRepo[repo]) {
        console.log('got hook for unknown repo', repo)
        res.end('Unknown', 404)
      }
      const projectId = this.projectsByRepo[repo]

      if (event === 'push') {
        this.manager.startBuild(projectId, {
          source: 'github-provider',
          sha: body.head_commit.id,
          ref: body.ref,
        })
        return res.end('Building', 200)
      }

      if (event === 'pull_request') {
        if (body.action === 'opened' || body.action === 'synchronize') {
          this.manager.startBuild(projectId, {
            source: 'github-provider',
            sha: body.pull_request.head.sha,
            pull_request: body.number,
            ref: `+refs/pull/${body.number}/merge`,
          })
          return res.end('Checking PR', 200)
        } else {
          console.log('unknown PR action', body.action)
        }
      }

      res.end('thanks', 200)
    })

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
    const isPullRequest = build.trigger && !!build.trigger.pull_request
    if (build.trigger && build.trigger.sha) {
      onStep('init', (builder, ctx, io) => {
        io.emit('info', 'Notifying github of pending build')
        ctx.githubSha = build.trigger.sha
        return sendStatus('pending', this.config.token, {
          repo: config.repo,
          sha: build.trigger.sha,
          isPR: isPullRequest,
          projectId: project.id,
          buildId: build.id,
        })
      })
    }

    onStep('getproject', (builder, ctx, io) => {
      const repo = ` https://${this.config.token}@github.com/${config.repo}`
      const ref = build.trigger && build.trigger.ref ? build.trigger.ref : 'master'
      const sha = build.trigger && (!build.trigger.pull_request) && build.trigger.sha || 'FETCH_HEAD'
      return builder.runCached({
        docker: {
          image: 'docker-ci/git',
        },
        env: ['GIT_TERMINAL_PROMPT=0'],
      }, {
        get: {
          cmd: `git init && git fetch ${repo} ${ref} && git checkout -q ${sha} && git status`,
          cleanCmd: `git init && git fetch https://[token]@github.com/${config.repo} ${ref} && git checkout -q ${sha}`
        },
        update: {
          cmd: `git fetch ${repo} ${ref} && git checkout -q ${sha} && git status`,
          cleanCmd: `git fetch https://[token]@github.com/${config.repo} ${ref} && git checkout -q ${sha}`
        },
        cachePath: 'project',
        projectPath: '.',
      })

      .then(() => {
        if (build.trigger && build.trigger.sha) return
        return builder.run('git rev-parse HEAD', {
          docker: {
            image: 'docker-ci/git',
          },
          env: ['GIT_TERMINAL_PROMPT=0'],
        }, {
          silent: true,
        }).then(({out, code}) => {
          var sha = out.trim();
          ctx.githubSha = sha
          return sendStatus('pending', this.config.token, {
            repo: config.repo,
            isPR: isPullRequest,
            sha: sha,
            projectId: project.id,
            buildId: build.id,
          })
        })
      })
    })

    onStep('posttest', (builder, ctx, io) => {
      if (!ctx.githubSha) return
      io.emit('info', 'Reporting success to github')
      return sendStatus('success', this.config.token, {
        repo: config.repo,
        sha: ctx.githubSha,
        isPR: isPullRequest,
        projectId: project.id,
        buildId: build.id,
      })
    })

    onStep('cleanup', (builder, ctx, io) => {
      const status = builder.getTestStatus()
      if (status === 'passed') return
      io.emit('info', 'Reporting failure to github')
      return sendStatus({
        failed: 'failure',
        passed: 'success',
        errored: 'error',
      }[status], this.config.token, {
        repo: config.repo,
        sha: ctx.githubSha,
        projectId: project.id,
        isPR: isPullRequest,
        buildId: build.id,
      })
    })
  }
}

function sendStatus(status, token, {repo, isPR, sha, projectId, buildId}) {
  const url = `https://api.github.com/repos/${repo}/statuses/${sha}?access_token=${token}`
  // console.log('Sending status', status, token, sha, repo, url);
  // console.log('POST', url)
  return prom(done =>
    superagent.post(url)
      .send({
        state: status,
        target_url: `http://localhost:3000/#/${projectId}/${buildId}`,
        description: isPR ? 'Baumeister Pull Request merge-tester' : 'Baumeister is working for you',
        context: isPR ? 'baumeister/ci-pr' : 'baumeister/ci',
      })
      .end((err, res) => {
        // console.log('GOT', err, res)
        if (err) {
          console.error('Failed to report status!', url);//, res.text);
          done(new Error('Failed to report status (' + status + '). This is a bug in the github-provider plugin'))
        }
        done()
      }))
}

