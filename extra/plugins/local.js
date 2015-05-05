
export default class Local {
  static buildTypes = ['docker', 'local']

  constructor(manager, app) {
    //
  }

  onBuild(project, build, onStep, config) {
    onStep('init', (builder, ctx, io) => {
      if (config.inPlace) {
        if (builder.type === 'docker') {
          ctx.runnerOptions.binds.push([`${config.path}:/project:rw`])
          ctx.dataContainer = null
        } else if (builder.type === 'local') {
          ctx.projectDir = config.path
        }
      } else {
        if (builder.type === 'docker') {
          ctx.runnerOptions.binds.push([`${config.path}:/localProject:rw`])
        }
      }
    })

    runner.use('getproject', (builder, ctx, io) => {
      if (config.inPlace) {
        return io.emit('info', `Using ${config.path} in place`)
      }
      if (build.type === 'docker') {
        return builder.run(`cp -RT /localProject /project`)
      }
      return builder.run(`cp -RT ${config.path} ${ctx.projectDir}`)
    })
  }
}



