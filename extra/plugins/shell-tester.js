
import {ConfigError} from '../../lib/errors'

class ShellTester {
  onBuild(project, build, onStep, config) {
    if (!config.command) {
      throw new ConfigError('`command` not provided', 'shell-tester.command')
    }
    onStep('test', (builder, ctx, io) => {
      const lines = config.command.split(/\n/g)
      function next() {
        return builder.run(lines.shift(), {
          cwd: config.cwd,
          docker: config.docker
        }).then(val => {
          if (lines.length) return next()
          return val
        })
      }
      return next()
    })
  }
}

export default {
  title: 'Shell Tester',
  plugin: ShellTester,
  description: 'Test using a custom command',
  projectConfig: {
    schema: {
      docker: {
        type: 'section',
        builder: 'docker',
        spec: {
          image: {
            type: 'text',
            default: 'jaeger/basic',
            title: 'Docker image (if using docker)',
          }
        }
      },
      cwd: {
        type: 'text',
        default: '',
        title: 'Working directory for the test (relative to the project directory)',
      },
      command: {
        type: 'text',
        default: 'make test',
        title: 'Shell command to run the tests (in the project directory)',
        multiline: true,
      },
    }
  }
}

