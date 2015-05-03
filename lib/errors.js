
class ConfigError extends Error {
  constructor(message) {
    super()
    this.message = message
  }
}

class InterruptError extends Error {
  constructor() {
    super()
    this.message = 'Build was interrupted'
  }
}

class ShellError extends Error {
  constructor(cmd, exitCode) {
    super()
    this.cmd = cmd
    this.exitCode = exitCode
  }
}

class FailError extends Error {
  constructor(message) {
    super(message)
    this.message = message
  }
}

export {ConfigError, InterruptError, ShellError, FailError}

