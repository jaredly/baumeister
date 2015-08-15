
import {ConfigError} from '../../lib/errors'

function runMulti(config, text) {
  return builder => {
    const lines = text.split(/\n/g)
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
  }
}

class ShellTester {
  onBuild(project, build, onStep, config) {
    if (!config.command && !config.pretest) {
      throw new ConfigError('One of either `pretest` or `command` must contain a command', 'shell-tester.command')
    }
    if (config.pretest) {
      onStep('pretest', runMulti(config, config.pretest));
    }
    if (config.command) {
      onStep('test', runMulti(config, config.command));
    }
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
      pretest: {
        type: 'text',
        default: '',
        title: 'Shell commanf to prepare for testing',
        multiline: true,
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

