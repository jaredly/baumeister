
import assign from 'object-assign'
import Runner from './runner'
import Promise from 'bluebird'
import uuid from './uuid'
import prom from './prom'
import aggEvents from '../lib/agg-events'
import {Project, Build} from './schema'
import {ConfigError, InterruptError, ShellError, FailError} from './errors'
import Replayable from './replayable'

export default class BuildManager {
  constructor(dao) {
    this.dao = dao
    this.running = {}
    this.plugins = {}
    this.builders = {}
  }

  init() {
    return this.dao.cleanUpZombies()
  }

  isRunning(id) {
    return !!this.running[id]
  }

  getProjectForBuild(id) {
    return this.running[id].project.id
  }

  getBuildHistory(id) {
    return this.running[id].io.history
  }

  addPlugins(plugins) {
    let names = Object.keys(plugins)
    this.plugins = assign(this.plugins, plugins)
    return this.dao.getProjects().then(projects => projects.forEach(project => names.forEach(name => {
      // console.log(project.name, JSON.stringify(project, null, 2))
      if (!project.plugins || !project.plugins[name]) return
      if (!plugins[name].onProject) return
      plugins[name].onProject(project, project.plugins[name])
    })))
  }

  addBuilders(builders) {
    this.builders = assign(this.builders, builders)
  }

  setDefaultBuilder(builderId) {
    if (!this.builders[builderId]) {
      throw new ConfigError(`Invalid default builder: ${builderId} not found`, 'config.defaultBuilder')
    }
    this.defaultBuilder = builderId
  }

  stopBuild(id) {
    if (!this.running[id]) {
      return Promise.reject(new Error('build not running'))
    }
    return this.running[id].stop()
  }

  getBuilderConfig(project, userConfig) {
    let id = this.defaultBuilder
    let globalConfig = {}, localConfig = {}
    if (project.builder && project.builder.id) {
      localConfig = project.builder.config
      id = project.builder.id
    }
    if (!this.builders[id]) {
      throw new ConfigError(`Unknown builder "${id}" configured for this project`)
    }
    if (userConfig.builders && userConfig.builders[id]) {
      globalConfig = userConfig.builders[id]
    } else {
      globalConfig = this.builders[id].globalConfig
    }
    return {id, globalConfig, localConfig}
  }

  startBuild(id, io, onId) {
    return Promise.all([
      this.dao.getProject(id),
      this.dao.getNextBuildNumber(id),
      this.dao.getConfig(),
    ]).then(([project, num, userConfig]) => {
      const data = {
        id: uuid(),
        project: project.id,
        started: Date.now(),
        finished: null,
        status: 'running',
        num,
        events: null,
      }
      if (onId) onId(data.id)
      project.latestBuild = data.id
      project.modified = data.started
      return this.dao.putBuild(data)
        .then(() => this.dao.putProject(project))
        .then(() => ({project, data, userConfig}))
    })
    .then(data => {
      try {
        return this.runBuild(io, data)
          .catch(error => {
            handleError(error, data.data)
            return {build: data.data, project: data.project}
          })
      } catch (error) {
        handleError(error, data.data)
        return {build: data.data, project: data.project}
      }
    })
  }

  runBuild(io, {project, data, userConfig}) {

    let interrupted = false
    io.on('interrupt', () => {
      interrupted = true
    })

    let saving = false
    let saveAfter = false
    let _saveInt = setInterval(() => {
      if (io.history.length) {
        data.events = aggEvents(io.history, null, true)
      }
      saving = true
      this.dao.putBuild(data)
        .then(_ => {
          saving = false
          if (saveAfter) {
            saveAfter()
          }
        })
    }, 1000)

    const runner = new Runner(io, project, data.id)
    this.running[data.id] = runner

    const bconfig = this.getBuilderConfig(project, userConfig)
    const Builder = this.builders[bconfig.id]
    const builder = new Builder(io, project, data.id,
                                bconfig.globalConfig, bconfig.localConfig)

    // log the configuration used
    data.config = {builder: bconfig, plugins: project.plugins}
    io.emit('build:created', data, true)

    Object.keys(project.plugins).forEach(id => {
      const plugin = this.plugins[id]
      if (!plugin) {
        throw new ConfigError(`Plugin ${id} not configured.`, 'project.plugins')
      }
      if (plugin.constructor.buildTypes && plugin.constructor.buildTypes.indexOf(builder.constructor.type) === -1) {
        throw new ConfigError(`Plugin ${id} is incompatible with builder ${builder.constructor.type}`)
      }
      if (!plugin.onBuild) return
      plugin.onBuild(
        project,
        data,
        wrapPluginStep(id, runner),
        project.plugins[id])
    })

    return runner.run(builder)
      .then(() => {
        data.status = 'succeeded'
      }, error => {
        console.log('build error', error, data)
        handleError(error, data)
      })
      .then(() => {
        data.events = aggEvents(io.history, null, true, data.status !== 'succeeded')
        data.finished = Date.now()
        data.duration = data.finished - data.started
        return new Promise((resolve, reject) => {
          clearInterval(_saveInt)
          saveAfter = () => {
            resolve({build: data, project})
            console.log('resolving. finished with all')
            delete this.running[data.id]
          }
          this.doPlugins('offBuild', project, data)
          if (saving) return
          this.dao.putBuild(data).then(saveAfter, reject)
        })
      })
  }

  doPlugins(name, project, ...args) {
    if (!project.plugins) return
    Object.keys(project.plugins).forEach(id => {
      const plugin = this.plugins[id]
      if (!plugin) {
        throw new ConfigError(`Plugin ${id} not configured.`, 'project.plugins')
      }
      if (!plugin[name]) return
      const params = [project].concat(args)
        .concat([project.plugins[id]])
      plugin[name].apply(plugin, params)
    })
  }

  clearData(id) {
    throw new Error('not implemented')
  }

  clearCache(id) {
    throw new Error('not implemented')
  }
}

function handleError(error, build) {
  if (error instanceof ConfigError) {
    build.status = 'errored'
    build.errorCause = 'configuration'
    build.error = {
      message: error.message,
      source: error.source
    }
  } else if (error instanceof InterruptError) {
    build.status = 'errored'
    build.errorCause = 'interrupted'
    build.error = 'Interrupted'
  } else if (error instanceof ShellError) {
    build.status = 'failed'
    build.errorCause = 'shell-exit'
    build.error = {
      exitCode: error.exitCode,
      cmd: error.cmd,
    }
  } else if (error instanceof FailError) {
    build.status = 'failed'
    build.errorCause = 'general'
    build.error = error.message
  } else {
    build.status = 'errored'
    build.errorCause = 'server'
    build.error = {
      message: error.message,
      stack: error.stack,
    }
  }
}

function wrapPluginStep(id, runner) {
  return function (step, fn, prepend) {
    return runner.use(step, function (builder, ctx, io) {
      return fn.call(this, {
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
        }
      }, ctx, io)

    }, prepend)
  }
}
