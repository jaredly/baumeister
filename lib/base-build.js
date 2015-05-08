
export default class BaseBuild {
  constructor(io, project, id, globalConfig, projectConfig) {
    this.io = io
    this.project = project
    this.id = id
    this.globalConfig = globalConfig || {}
    this.projectConfig = projectConfig || {}
    this.ctx = {}
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

  getContext() {
    return {}
  }

  pluginProxy(id) {
    const builder = this
    return {
      type: builder.constructor.type,
      run(cmd, runConfig, cmdConfig) {
        runConfig = runConfig || {}
        runConfig.plugin = id
        return builder.run(cmd, runConfig, cmdConfig)
      },
      runCached(runConfig, config) {
        runConfig = runConfig || {}
        runConfig.plugin = id
        return builder.runCached(runConfig, config)
      },
      shell(config) {
        config = config || {}
        config.plugin = id
        return builder.shell(config)
      },
      io: this.io,
      pluginEvent(name, payload) {
        builder.io.emit('plugin-event', {
          plugin: id,
          evt: name,
          val: payload,
        })
      }
    }
  }

  run(cmd, runConfig, cmdConfig) {
    if (!cmd) {
      throw new Error('cmd not given')
    }
    const sh = this.shell(runConfig)
    return sh.init()
      .then(() => sh.run(cmd, cmdConfig))
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
  if (!config.get) {
    throw new Error('get not given')
  }
  if (!config.update) {
    throw new Error('update not given')
  }
  return sh.init()
    .then(() => sh.run(`stat ${projectCache}`, {
      badExitOK: true,
      silent: true,
    }))
    .then(result => {
      if (result.code !== 0) {
        return sh.run(config.get)
          .then(() => sh.run(`cp -RT ${projectPath} ${projectCache}`, {
            silent: true,
            cleanCmd: `cp -RT [project]/${config.projectPath} [cache]/${config.cachePath}`,
          }))
      }
      io.emit('info', 'Using cache')
      return sh.run(`rsync -azrh ${projectCache}/ ${projectPath}/`, {
        silent: true,
        cleanCmd: `rsync -azrh [cache]/${config.cachePath} [project]/${config.projectPath}`,
      })
        .then(() => sh.run(config.update))
        .then(() => sh.run(`rsync -azrh --delete-after ${projectPath}/ ${projectCache}/`, {
          silent: true,
          cleanCmd: `rsync -azrh --delete-after [project]/${config.projectPath} [cache]/${config.cachePath}`,
        }))
    })
    .then(() => sh.stop())
}

