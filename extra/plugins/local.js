
export default class Local {
  static buildTypes = ['docker', 'local']

  constructor(manager, app) {
    //
  }

  onBuild(project, runner, build, config) {
    runner.use('init', () => {
      if (config.inPlace) {
        if (build.type === 'docker') {
          build.runnerOptions.binds.push([`${config.path}:/project:rw`])
          build.dataContainer = null
        } else if (build.type === 'local') {
          build.dataDir = config.path
        }
      } else {
        if (build.type === 'docker') {
          build.runnerOptions.binds.push([`${config.path}:/localProject:rw`])
        }
      }
    })

    runner.use('getproject', () => {
      if (config.inPlace) {
        return build.io.emit('info', `Using ${config.path} in place`)
      }
      return build.run(`cp -RT /localProject /project`)
    })
  }
}



