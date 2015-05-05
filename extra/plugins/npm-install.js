
class NPMInstall {
  constructor(manager, app) {
    this.manager = manager
    this.app = app
  }

  onBuild(project, build, onStep, config) {
    onStep('pretest', (builder, ctx, io) => {
      if (!config.cache) {
        return builder.run('npm install', {
          docker: {
            image: 'jaeger/node',
          },
        })
      }
      return builder.runCached({
        docker: {
          image: 'jaeger/node',
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

export default {
  title: 'NPM Install',
  plugin: NPMInstall,
  projectConfig: {
    schema: {
      cache: {
        type: 'checkbox',
        default: true,
        title: 'Cache modules',
      },
    }
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
