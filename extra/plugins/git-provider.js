
class GitProvider {
  onBuild(project, build, onStep, config) {
    onStep('getproject', (builder, ctx, io) => {
      if (!config.cache) {
        return builder.run(`git clone ${config.repo} .`, {
          docker: {
            image: 'docker-ci/git',
          },
          env: ['GIT_TERMINAL_PROMPT=0'],
        })
      }
      return builder.runCached({
        docker: {
          image: 'docker-ci/git',
        },
        env: ['GIT_TERMINAL_PROMPT=0'],
      }, {
        get: `git clone ${config.repo} .`,
        update: `git pull`,
        cachePath: 'project',
        projectPath: '.',
      })
    })
  }
}

export default {
  sort: 0,
  plugin: GitProvider,
  title: 'Git Provider',
  description: 'Get your project from a git repository',
  projectConfig: {
    schema: {
      repo: {
        type: 'text',
        default: 'https://some.git/repo',
        title: 'The git repository',
      },
      cache: {
        type: 'checkbox',
        default: true,
        title: 'Cache the repo locally',
      }
    }
  },
}

/*
module.exports = {
  provide(build, ctx, out, done) {
    build.runCached({
      docker: {
        image: 'docker-ci/git',
      },
    }, {
      cachePath: 'project',
      projectPath: '.',
      get: `git clone ${config.source.repo} .`,
      update: 'git pull',
    }, done)
  }
}
*/
