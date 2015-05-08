
class ConfigError extends Error {
  constructor(message, source, help) {
    super()
    this.message = message
    this.source = source
    this.help = help
  }
}

class InterruptError extends Error {
  constructor() {
    super()
    this.message = 'Build was interrupted'
  }
}

class ShellError extends Error {
  constructor(cmd, exitCode, output) {
    super()
    this.cmd = cmd
    this.exitCode = exitCode
    this.output = output
  }
}

class FailError extends Error {
  constructor(message) {
    super(message)
    this.message = message
  }
}

export {ConfigError, InterruptError, ShellError, FailError}

