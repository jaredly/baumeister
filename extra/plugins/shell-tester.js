
export default class ShellTester {
  onBuild(project, build, runner, config) {
    runner.use('test', (builder, ctx, io) => {
      return builder.run(config.command)
    })
  }
}


