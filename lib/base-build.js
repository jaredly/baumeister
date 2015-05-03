
export default class BaseBuild {
  constructor(io, project, id, config) {
    this.io = io
    this.project = project
    this.id = id
    this.config = config
  }

  /**
   * to be overridden
   * you can also add methods corresponding to STAGES, and they will be run
   * *at the end* of that stage. This is so that plugins can change your
   * default behavior.
   */
  init() { }

  /**
   * Create a shell!
   *
   * Returns an object that has
   * .init()
   * .run(cmd)
   * .stop()
   *
   * All of which return promises.
   */
  shell(options) {
    // this should pay attention to the `interrupt` event
    throw new Error('override')
  }

  run(cmd, runConfig) {
    const sh = this.shell(runConfig)
    return sh.init()
      .then(() => sh.run(cmd))
      .then(() => sh.stop())
  }

  runCached(runConfig, config) {
    const sh = this.shell(runConfig)
    return runCached(this.io, sh, config)
  }
}

function runCached(io, sh, config) {
  const projectCache = `${sh.cacheDir}/${config.cachePath}`
  const projectPath = `${sh.projectDir}/${config.projectPath}`
  let cached = false
  return sh.init()
    .then(() => sh.run(`stat ${projectCache}`, {
      badExitOK: true,
      silent: true,
    }))
    .then(result => {
      if (result.code !== 0) {
        return sh.run(config.get)
          .then(_ => sh.run(`cp -RT ${projectPath} ${projectCache}`))
      }
      cached = true
      io.emit('info', 'Using cache')
      return sh.run(`rsync -azrh ${projectCache} ${projectPath}`)
        .then(_ => sh.run(config.update))
        .then(_ => sh.run(`rsync -azrh --delete-after ${projectPath} ${projectCache}`))
    })
    .then(_ => sh.stop())
}
