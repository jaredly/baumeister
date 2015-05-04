
export default class ShellTester {
  onBuild(project, build, onStep, config) {
    onStep('test', (builder, ctx, io) => {
      return builder.run(config.command)
    })
  }
}


