
class ShellProvider {
  onBuild(project, build, onStep, config) {
    onStep('getproject', (builder, ctx, io) => {
      if (!config.update) {
        return builder.run(config.get, {
          docker: {
            image: config.dockerImage
          }
        })
      }
      return builder.runCached({
        docker: {
          image: config.dockerImage
        }
      }, {
        get: config.get,
        update: config.update,
        cachePath: 'project',
        projectPath: '.',
      })
    })
  }
}

export default {
  sort: 0,
  plugin: ShellProvider,
  title: 'Shell Provider',
  description: 'Enter a custom command to get your project',
  projectConfig: {
    schema: {
      dockerImage: {
        type: 'text',
        default: 'jaeger/basic',
        title: 'Docker image (if using docker)',
        builder: 'docker',
      },
      get: {
        type: 'text',
        default: 'wget https://site.com/myproj.tgz && tar xf myproj.tgz',
        title: 'Get the project, putting the files in the current directory',
      },
      update: {
        type: 'text',
        default: '',
        title: 'Update the project. Leave blank to disabled caching',
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
