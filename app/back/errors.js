
class ConfigError {
  constructor(message) {
    this.message = message
  }
}

class InterruptError {
  constructor() {
    this.message = 'Build was interrupted'
  }
}

class ShellError {
  constructor(cmd, exitCode) {
    this.cmd = cmd
    this.exitCode = exitCode
  }
}

export {ConfigError, InterruptError, ShellError}

