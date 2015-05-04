
export default class ShellProvider {
  constructor(manager, app) {
    this.manager = manager
    this.app = app
  }

  onBuild(project, build, runner, config) {
    runner.use('getproject', (builder, ctx, io) => {
      return builder.runCached({
        image: config.dockerImage
      }, {
        get: config.get,
        update: config.update,
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
        image: config.source.base || 'ubuntu',
      },
    }, {
      cachePath: 'project',
      projectPath: '.',
      get: config.source.get,
      update: config.source.update,
    }, done)
  }
}
*/
