
import assign from 'object-assign'
import Runner from './runner'
import Promise from 'bluebird'
import uuid from './uuid'
import prom from './prom'
import aggEvents from '../lib/agg-events'
import {Project, Build} from './schema'
import {ConfigError} from './errors'
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
    return this.running[val].history
  }

  addPlugins(plugins) {
    let names = Object.keys(plugins)
    this.plugins = assign(this.plugins, plugins)
    return this.dao.getProjects().then(projects => projects.forEach(project => names.forEach(name => {
      // console.log(project.name, JSON.stringify(project, null, 2))
      if (!project.plugins || !project.plugins[name]) return
      plugins[name].onProject(project, project.plugins[name])
    })))
  }

  addBuilders(builders) {
    this.builders = assign(this.builders, builders)
  }

  setDefaultBuilder(builderId) {
    if (!this.builders[builderId]) {
      throw new ConfigError(`Invalid default builder: ${builder} not found`)
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
      if (!this.builders[project.builder.id]) {
        throw new ConfigError(`Unknown builder "${project.builder.id}" configured for this project`)
      }
      localConfig = project.builder.config
    }
    if (userConfig.builders && userConfig.builders[id]) {
      globalConfig = userConfig.builders[id]
    } else {
      globalConfig = this.builders[id].globalConfig
    }
    return {id, globalConfig, localConfig}
  }

  startBuild(id, io, onId) {
    return Project.all([
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
    .then(data => this.runBuild(io, data))
  }

  runBuild(io, {project, data, userConfig}) {

    let interrupted = false
    io.on('interrupt', () => {
      interrupted = true
    })

    let saving = false
    let saveAfter = false
    let _saveInt = setInterval(() => {
      data.events = aggEvents(io.history, null, true)
      saving = true
      this.dao.putBuild(data)
        .then(_ => {
          saving = false
          if (saveAfter) {
            saveAfter()
          }
        })
    }, 1000)

    io.emit('build:created', data)

    const runner = new Runner(io, project, data.id)
    this.running[data.id] = runner

    const bconfig = this.getBuilderConfig(project, userConfig)
    const Builder = this.builders[bconfig.id]
    const builder = new Builder(io, project, data.id,
                                bconfig.globalConfig, bconfig.localConfig)

    this.doPlugins('onBuild', project, build, builder)
    return runner.run(builder)
      .then(() => {
        data.status = 'succeeded'
      }, error => {
        handlerError(error, data)
      })
      .then(() => {
        data.events = aggEvents(io.history, null, true, data.status !== 'succeeded')
        data.finished = Date.now()
        data.duration = data.finished - data.started
        clearInterval(_saveInt)
        saveAfter = () => {
          done(data)
        }
        if (!saving) saveAfter()
        return {build: data, project}
      })
  }

  doPlugins(name, project, ...args) {
    Object.keys(this.plugins).forEach(id => {
      if (!project.plugins || !project.plugins[id]) return
      const plugin = this.plugins[id]
      const params = [project].concat(args)
        .concat([project.plugins[id]])
      plugin[name].apply(plugin, params)
    })
  }

  clearCache(id) {
    return this.dao.getProject(id)
      .then(project => {
        if (!project) throw new Error('Project not found')
        return prom(done =>
          new Runner(project, null).clearCache(done))
      })
  }

}

function handleError(error, build) {
  if (error instanceof ClientError) {
    build.status = 'errored'
    build.errorCause = 'configuration'
    build.error = error.message
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

function runBuild(r, project, data, out, db, done) {
  console.log('running', project, data)

  r.run((err, exitCode) => {
    if (err || interrupted) {
      console.log('ERR build', err, interrupted)
      data.status = 'errored'
      data.interrupted = true
      data.error = err
    } else if (exitCode) {
      console.log('Nonzero exit code', exitCode)
      data.status = 'failed'
      data.error = 'Nonzero status code'
    } else {
      data.status = 'succeeded'
    }
  })
}
