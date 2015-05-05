
import {ConfigError} from '../../lib/errors'

export default class ShellTester {
  onBuild(project, build, onStep, config) {
    if (!config.command) {
      throw new ConfigError('`command` not provided', 'shell-tester.command')
    }
    onStep('test', (builder, ctx, io) => {
      return builder.run(config.command, {
        docker: config.docker
      })
    })
  }
}


