
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
  constructor(io, dao, logger) {
    this.io = io
    this.dao = dao
    this.logger = logger
    this.running = {}
    this.plugins = {}
    this.builders = {}
    this.projectPlugins = {}

    io.on('config:save', value => {
      // TODO notify plugins that their config has changed
      Object.keys(this.plugins).forEach(name => {
        if (this.plugins[name].onConfig) {
          this.plugins[name].onConfig(value.plugins[name])
        }
      })
    })
    io.on('project:delete', project => {
      // TODO test offProject for deleted projects
      const id = project.id
      // offProject for plugins
      Object.keys(this.plugins).forEach(name => {
        if (!this.projectPlugins[name]) {
          this.projectPlugins[name] = {}
        }
        const oldConfig = this.projectPlugins[name][id]
        this.projectPlugins[name][id] = null
        if (!this.plugins[name].offProject) return
        this.plugins[name].offProject(project, oldConfig)
      })
    })
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
      if (!project.plugins || !project.plugins[name]) return
      if (!this.projectPlugins[name]) {
        this.projectPlugins[name] = {}
      }
      this.projectPlugins[name][project.id] = project.plugins[name]
      if (!plugins[name].onProject) return
      plugins[name].onProject(project, project.plugins[name])
    })))
  }

  handleProjectUpdate(id, project) {
    Object.keys(this.plugins).forEach(name => {
      if (!this.projectPlugins[name]) {
        this.projectPlugins[name] = {}
      }
      if (this.projectPlugins[name][id]) {
        if (project.plugins[name]) return
        const oldConfig = this.projectPlugins[name][id]
        this.projectPlugins[name][id] = null
        if (!this.plugins[name].offProject) return
        this.plugins[name].offProject(project, oldConfig)
      } else if (project.plugins[name]) {
        this.projectPlugins[name][id] = project.plugins[name]
        if (!this.plugins[name].onProject) return
        this.plugins[name].onProject(project, project.plugins[name])
      }
    })
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

  updateProjectFromBuild(project, build) {
    return prom(done => {
      const pluginData = assign({}, project.pluginData)
      let changed = false
      Object.keys(project.plugins).forEach(name => {
        if (!this.plugins[name].projectDataFromBuild) return
        changed = true
        pluginData[name] = this.plugins[name].projectDataFromBuild(build, project.plugins[name],
                                                                  project.pluginData[name], project)
      })
      if (!changed) return done()
      this.dao.updateProject(project.id, {pluginData})
        .then(project => {
          this.io.emit('project:update', project)
          done()
        }, done)
    })
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
    .then(({project, data, userConfig}) => {
      const finishUp = error => {
        handleError(error, data)
        data.finished = Date.now()
        data.duration = data.finished - data.started
        try {
          this.doPlugins('offBuild', project, data)
        } catch (err) {
          this.logger.error('Failed to run "offBuild" in the finishUp handler', err)
        }
        return this.dao.putBuild(data).then(() => {
          delete this.running[data.id]
          return this.updateProjectFromBuild(project, data)
              .then(() => ({build: data, project}),
                   err => {
                this.logger.error('upedateProjectFromBuild raised an error!', err)
                return {build: data, project}
              })
        })
      }

      try {
        return this.runBuild(io, {project, data, userConfig}).catch(finishUp)
      } catch (error) {
        return finishUp(error)
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

    Object.keys(project.plugins).forEach(id => {
      const plugin = this.plugins[id]
      if (!plugin) {
        throw new ConfigError(`Plugin ${id} is not installed`,
          'plugins', 'Add it to your config.json in the base of the jaeger installation directory.')
      }
      if (plugin.buildTypes && plugin.buildTypes.indexOf(builder.constructor.type) === -1) {
        throw new ConfigError(`Plugin ${id} is incompatible with builder ${builder.constructor.type}`)
      }
      if (!plugin.onBuild) return
      plugin.onBuild(
        project,
        data,
        wrapPluginStep(id, runner),
        project.plugins[id])
    })

    io.emit('build:created', data, true)
    return runner.run(builder)
      .then(() => {
        data.status = 'succeeded'
      }, error => {
        handleError(error, data)
      })
      .then(() => {
        data.finished = Date.now()
        data.duration = data.finished - data.started
        data.events = aggEvents(io.history, null, true, data.status !== 'succeeded')
        return new Promise((resolve, reject) => {
          clearInterval(_saveInt)
          saveAfter = () => {
            this.updateProjectFromBuild(project, data)
              .then(() => resolve({build: data, project}),
                   err => {
                this.logger.error('upedateProjectFromBuild raised an error!', err)
                resolve({build: data, project})
              })
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
      source: error.source,
      help: error.help,
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
      return fn.call(this, builder.pluginProxy(id), ctx, io)
    }, prepend)
  }
}

