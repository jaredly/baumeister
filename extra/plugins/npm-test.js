
class NPMTest {
  constructor(manager, app) {
    this.manager = manager
    this.app = app
  }

  onBuild(project, build, onStep, config) {
    onStep('test', (builder, ctx, io) => {
      return builder.run('npm test', {
        docker: {
          image: 'jaredly/node',
        }
      })
    })
  }
}

export default {
  title: 'NPM Test',
  description: 'Does what it says on the label',
  plugin: NPMTest,
  projectConfig: {
    schema: {}
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

