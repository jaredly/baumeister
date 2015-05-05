
export default class NPMInstall {
  constructor(manager, app) {
    this.manager = manager
    this.app = app
  }

  onBuild(project, build, onStep, config) {
    onStep('pretest', (builder, ctx, io) => {
      return builder.runCached({
        docker: {
          image: 'jaredly/node',
        }
      }, {
        get: 'npm install',
        update: 'npm install',
        cachePath: 'node_modules',
        projectPath: 'node_modules',
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
