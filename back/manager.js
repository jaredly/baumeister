
import Runner from './runner'
import EventEmitter from 'eventemitter3'
import {validate} from 'tcomb-validation'
import Promise from 'bluebird'
import uuid from './uuid'
import prom from './prom'
import async from 'async'
import aggEvents from '../lib/agg-events'
import Client from './ws-client'
import {Project, Build} from './schema'

export default class Manager {
  constructor(db, basepath) {
    super()
    this.basepath = basepath
    this.db = db
    this.running = {}
    this.subs = {}
    this.clients = []
  }

  init() {
    return this.db.all('builds')
      .then(builds => {
        let zombies = builds.filter(b => b.status == 'running')
        if (!zombies) return
        console.log('cleaning up zombies')
        zombies.forEach(z => {
          z.finished = new Date()
          z.status = 'errored'
        })
        return this.db.batch('builds', zombies.map(z => ({type: 'put', key: z.id, value: z})))
      })
  }

  getConfig() {
    return this.db.get('config', 'default')
      .catch(err => ({notifications: 'all'}))
  }

  setConfig(data) {
    return this.db.put('config', 'default', data)
      .then(_ => data)
  }

  newConnection(socket) {
    const client = new Client(socket)
    this.clients.push(client)
    client.on('build:view', val => {
      if (!this.running[val]) {
        return console.error('NO BUILD', val)
      }
      this.unSub(client.openBuild, client)
      client.openBuild = val
      this.addSub(client.openBuild, client)
      client.send('build:history', {
        id: val,
        project: this.running[val].project.id,
        events: aggEvents(this.running[val].history)
      })
    })
    socket.on('close', _ => {
      this.clients.splice(this.clients.indexOf(client), 1)
    })
  }

  updateProject(id, data) {
    return this.getProject(id)
      .then(project => {
        for (let name in data) {
          project[name] = data[name]
        }
        project.modified = new Date()
        console.log('validate')
        const val = validate(project, Project)
        console.log(val, val.isValid)
        if (!val.isValid()) {
          console.log(JSON.stringify(val, null, 2))
          return Promise.reject(
            new Error('Invalid project data: \n' +
              val.errors.map(e => e.message).join('\n')))
        }
        return this.db.put('projects', id, project)
          .then(() => {
            this.emit('project:update', project)
          })
      })
  }

  stopBuild(id) {
    if (!this.running[id]) {
      return Promise.reject(new Error('build not running'))
    }
    return prom(done => this.running[id].stop(done))
  }

  addProject(data) {
    data.id = uuid()
    data.modified = new Date()
    const val = validate(data, Project)
    if (!val.isValid()) {
      console.log(val)
      console.log(val.errors)
      return Promise.reject(
        new Error('Invalid project data: \n' +
          val.errors.map(e => e.message).join('\n')))
    }
    return this.db.put('projects', data.id, data)
      .then(() => data)
  }

  getProject(id) {
    const isId = +id.slice(0, 13) == id.slice(0, 13)
    if (isId) {
      return this.db.get('projects', id)
        .catch(err => {
          throw new Error(`Project not found "${id}"`)
        })
    }
    return this.db.find('projects', {name: id})
      .catch(err => {
        throw new Error('DB query for project failed')
      })
      .then(projects => {
        if (!projects.length) throw new Error(`Project "${id}" not found`)
        if (projects.length > 1) throw new Error(`Multiple projects named "${id}"`)
        return projects[0]
      })
  }

  getProjectsWithBuilds() {
    return this.db.all('projects')
      .then(projects => {
        const tasks = {}
        const pmap = {}
        projects.forEach(proj => {
          pmap[proj.id] = proj
          if (!proj.latestBuild) return
          tasks[proj.id] = next => this.db.nget('builds', proj.latestBuild, next)
        })
        return prom(done => {
          async.parallel(tasks, (err, res) => {
            if (err) return done(err)
            for (let name in res) {
              pmap[name].latestBuild = res[name]
            }
            done(null, pmap)
          })
        })
      })
  }

  getProjects() {
    return this.db.all('projects')
      .then(projects => {
        const pmap = {}
        projects.forEach(p => pmap[p.id] = p)
        return pmap
      })
  }

  deleteProject(id) {
    return this.db.del('projects', id)
  }

  getBuilds(project) {
    if (!project) {
      return this.db.all('builds')
    }
    return this.getProject(project)
      .then(proj => {
        return this.db.find('builds', {project: proj.id})
          .then(builds => builds.reduce((rev, n) => (rev.unshift(n), rev), []))
      })
  }

  runBuild(project, data) {
    console.log('running', project, data)
    const r = new Runner(project, data.id, this.basepath)
    this.running[data.id] = r

    const this_ = this
    let section = null
    r.pipe({
      emit(evt, val) {
        // console.log('evt', evt, val)
        if (evt === 'section') section = val
        this_.emit(data.id, 'build:event', {
          build: data.id,
          project: project.id,
          event: {evt, val, section}
        })
      }
    })

    this.emit('build:new', data)

    let interrupted = false

    r.on('interrupt', () => {
      interrupted = true
    })

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
      data.events = aggEvents(r.history)
      data.finished = Date.now()
      data.duration = data.finished - data.started
      this.emit('build:status', {project: project.id, build: data.id, duration: data.duration, status: data.status})
      this.emit('build:done', {
        project: {id: project.id, name: project.name},
        build: {id: data.id, num: data.num, duration: data.duration, status: data.status}
      })
      this.db.put('builds', data.id, data)
        .then(_ => {
          this.emit('build:update', data)
          this.running[data.id] = null
        })
    })
  }

  startBuild(id) {
    return this.getProject(id)
      .then(project => {
        if (!project) throw new Error('Project not found')
        return this.db.find('builds', {project: project.id})
          .then(builds => builds.length + 1)
          .then(num => {
            const data = {
              id: uuid(),
              project: project.id,
              started: Date.now(),
              finished: null,
              status: 'running',
              num,
              events: null,
            }
            project.latestBuild = data.id
            project.modified = data.started
            return this.db.put('builds', data.id, data)
              .then(_ => this.db.put('projects',
                                     project.id,
                                     project))
              .then(() => {
                this.runBuild(project, data)
                return data.id
              })
          })
      })
  }

  clearCache(id) {
    return this.getProject(id)
      .then(project => {
        if (!project) throw new Error('Project not found')
        return prom(done =>
          new Runner(project, null).clearCache(done))
      })
  }

  emit(id, evt, val) {
    if (arguments.length === 2) {
      return this.clients.forEach(c => c.send(id, evt))
    }
    if (!this.subs[id]) return
    this.subs[id].forEach(c => c.send(evt, val))
  }

  addSub(id, fn) {
    if (!this.running[id]) return
    // this.running[id].history.forEach(v => client.(id, v.evt, v.val))
    if (!this.subs[id]) this.subs[id] = [fn]
    else this.subs[id].push(fn)
  }

  unSub(id, fn) {
    if (!id || !this.subs[id]) return
    const ix = this.subs[id].indexOf(fn)
    if (ix === -1) return false
    this.subs[id].splice(ix, 1)
    return true
  }

  getBuild(project, id) {
    const isNum = id == +id
    if (isNum) {
      return this.db.find('builds', {project, num: +id})
        .then(builds => builds[0])
    }
    return this.db.get('builds', id)
  }

  deleteBuild(id) {
    return this.db.del('build', id)
  }
}

