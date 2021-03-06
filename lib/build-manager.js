
import Runner from './runner'
import Promise from 'bluebird'
import uuid from './uuid'
import aggEvents from '../lib/agg-events'
import {ConfigError, InterruptError, ShellError, FailError} from './errors'
 
/**
 * Keeps track of all the builds
 *
 * - startBuild(projectId) to start a ew build, returns a promise that reflects the
 *   state of the build
 * - isRunning(buildId) -> whether a build is still running
 * - getProjectForBuild(buildId) -> projectId ; a convenience function for
 *   getting the projectId of a running build
 * - getBuildHistory(buildId) -> the current events list for a running build
 * - stopBuild(buildId) -> interrupt a build. returns a promise that resolves
 *   when the build has been successfully interrupted.
 */
export default class BuildManager {
  constructor(io, dao, logger, plugins) {
    this.io = io
    this.dao = dao
    this.logger = logger
    this.plugins = plugins
    this.running = {}
  }

  /**
   * Run when the server starts up. Cleanup zombie builds.
   */
  init() {
    return this.dao.cleanUpZombies()
  }

  /**
   * buildId -> is the build still running
   */
  isRunning(id) {
    return !!this.running[id]
  }

  /**
   * buildId -> projectId for a running build
   */
  getProjectForBuild(id) {
    return this.running[id].project.id
  }

  /**
   * buildId -> events list ; the events so far for a running build
   */
  getBuildHistory(id) {
    return this.running[id].io.history
  }

  /**
   * buildId -> promise that resolves when the build is finished
   */
  stopBuild(id) {
    if (!this.running[id]) {
      return Promise.reject(new Error('build not running'))
    }
    return this.running[id].stop()
  }

  /**
   * Start of a build for a project
   *
   * - id ; the project id
   * - trigger ; an object indicating what triggered the build. It should have
   *   {
   *     source: 'plugin id or something',
   *     user: { // info about the user that started it
   *     }
   *   }
   * - io ; the eventemitter on which events will be reported
   * - onId ; a function that's called as soon as an id has been created for
   *   the new build
   *
   * Returns a promise that resolves then the build is finished.
   */
  startBuild(id, trigger, io, onId) {
    if (!io) throw new Error('IO is required')
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
        trigger: trigger,
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
          this.plugins.offBuild(project, data, {})
        } catch (err) {
          this.logger.error('Failed to run "offBuild" in the finishUp handler', err)
        }
        return this.dao.putBuild(data).then(() => {
          delete this.running[data.id]
          return this.plugins.updateProjectFromBuild(project, data)
              .then(() => ({build: data, project}),
                   err => {
                this.logger.error('upedateProjectFromBuild raised an error!', err)
                return {build: data, project}
              })
        })
      }

      try {
        return this._runBuild(io, {project, data, userConfig}).catch(finishUp)
      } catch (error) {
        return finishUp(error)
      }
    })
  }

  clearData(id) {
    throw new Error('not implemented')
  }

  clearCache(id) {
    throw new Error('not implemented')
  }

  /**
   * Internal - used by startBuild
   *
   * Creates the builder and runner and uses them to run the build.
   */
  _runBuild(io, {project, data, userConfig}) {

    let saving = false
    let saveAfter = false
    let _saveInt = setInterval(() => {
      if (io.history.length) {
        data.events = aggEvents(io.history, null, true)
      }
      saving = true
      this.dao.putBuild(data)
        .then(() => {
          saving = false
          if (saveAfter) {
            saveAfter()
          }
        })
    }, 1000)

    const runner = new Runner(io, project, data.id)
    this.running[data.id] = runner

    const bconfig = this.plugins.getBuilderConfig(project, userConfig)
    const Builder = this.plugins.getBuilder(bconfig.id)
    const builder = new Builder(io, project, data.id,
                                bconfig.globalConfig, bconfig.localConfig)

    // log the configuration used
    data.config = {builder: bconfig, plugins: project.plugins}

    try {
      this.plugins.onBuild(project, data, bconfig.id, runner)
    } catch (e) {
      return Promise.reject(e)
    }

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
            this.plugins.updateProjectFromBuild(project, data)
              .then(() => resolve({build: data, project}),
                   err => {
                this.logger.error('upedateProjectFromBuild raised an error!', err)
                resolve({build: data, project})
              })
            delete this.running[data.id]
          }
          this.plugins.offBuild(project, data, builder.ctx)
          if (saving) return
          this.dao.putBuild(data).then(saveAfter, reject)
        })
      })
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
      output: error.output,
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

