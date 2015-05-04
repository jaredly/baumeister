
export default class ShellProvider {
  constructor(manager, app) {
    this.manager = manager
    this.app = app
  }

  onBuild(project, build, onStep, config) {
    onStep('getproject', (builder, ctx, io) => {
      return builder.runCached({
        image: 'docker-ci/git',
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
