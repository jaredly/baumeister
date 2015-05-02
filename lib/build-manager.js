
import assign from 'object-assign'
import Runner from './runner'
import Promise from 'bluebird'
import uuid from './uuid'
import prom from './prom'
import aggEvents from '../lib/agg-events'
import {Project, Build} from './schema'

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
      console.log(project.name, JSON.stringify(project, null, 2))
      if (!project.plugins || !project.plugins[name]) return
      plugins[name].onProject(project, project.plugins[name])
    })))
  }

  addBuilders(builders) {
    this.buildes = assign(this.builders, builders)
  }

  stopBuild(id) {
    if (!this.running[id]) {
      return Promise.reject(new Error('build not running'))
    }
    return prom(done => this.running[id].stop(done))
  }

  startBuild(id, onId) {
    return this.dao.getProject(id).then(project => {
      if (!project) throw new Error('Project not found')
      return this.dao.getNextBuildNumber()
        .then(num => this._startBuild(project, num, onId))
    })
  }

  _startBuild(project, num, onId) {
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
    this.doPlugins('onBuild', project, data)
    project.latestBuild = data.id
    project.modified = data.started

    return this.dao.putBuild(data)
      .then(() => this.dao.putProject(project))
      .then(() => {
        const r = new Runner(project, data.id, this.basepath)
        this.running[data.id] = r
        runBuild(r, project, data, this, this.db, build => {
          this.putBuild(build)
            .then(_ => {
              console.log('BUILD UPDATE')
              console.log(JSON.stringify(build, null, 2))
              this.emit('build:update', build)
              this.running[build.id] = null
              this.doPlugins('offBuild', project, data)
            })
        })
        return data.id
      })
  }

  doPlugins(name, project, ...args) {
    Object.keys(this.plugins).forEach(id => {
      if (!project.plugins || !project.plugins[id]) return
      const plugin = this.plugins[id]
      const params = [project].concat(args).concat([project.plugins[id]])
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

function runBuild(r, project, data, out, db, done) {
  console.log('running', project, data)

  let section = null
  r.io.pipe({
    emit(evt, val) {
      if (evt === 'section') section = val
      out.emit(data.id, 'build:event', {
        build: data.id,
        project: project.id,
        event: {evt, val, section, time: Date.now()}
      })
    }
  })

  out.emit('build:new', data)

  let interrupted = false

  r.io.on('interrupt', () => {
    interrupted = true
  })

  let saving = false
  let saveAfter = false
  let _saveInt = setInterval(() => {
    data.events = aggEvents(r.io.history, null, true)
    saving = true
    db.put('builds', data.id, data)
      .then(_ => {
        saving = false
        if (saveAfter) {
          saveAfter()
        }
      })
  }, 1000)

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
    data.events = aggEvents(r.io.history, null, true, err || exitCode)
    data.finished = Date.now()
    data.duration = data.finished - data.started
    out.emit('build:status', {
      project: project.id,
      build: data.id,
      duration: data.duration,
      status: data.status
    })
    out.emit('build:done', {
      project: {
        id: project.id,
        name: project.name
      },
      build: {
        id: data.id,
        num: data.num,
        duration: data.duration,
        status: data.status
      }
    })
    clearInterval(_saveInt)
    saveAfter = () => {
      done(data)
    }
    if (!saving) saveAfter()
  })
}
