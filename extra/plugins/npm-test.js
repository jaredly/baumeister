
export default class NPMTest {
  constructor(manager, app) {
    this.manager = manager
    this.app = app
  }

  onBuild(project, build, onStep, config) {
    onStep('test', (builder, ctx, io) => {
      return builder.run('npm test')
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
