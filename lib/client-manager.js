
import aggEvents from '../lib/agg-events'
import Client from './ws-client'
import {Project, Build} from './schema'
import Replayable from './replayable'

/**
 * Manages interaction between Clients and builds.
 * A client can subscribe to updates.
 */
export default class ClientManager {
  constructor(dao, builds) {
    this.dao = dao
    this.builds = builds
    this.clients = []
    this.subs = {}
  }

  init() {
  }

  startBuild(projectId, onId) {
    const io = new Replayable()

    const prom = this.builds.startBuild(projectId, io, buildId => {
      // this is called once an ID has been created
      // meaning that the project exists and the build has been created, but
      // not yet started.
      onId && onId(buildId)
      /** Hook up IO -> ClientEmit **/
      let section = null
      io.on('build:created', data => {
        this.emit('build:new', data)
      })
      const cman = this
      io.pipe({
        emit(evt, val) {
          if (evt === 'section') section = val
          cman.emit(buildId, 'build:event', {
            build: buildId,
            project: projectId,
            event: {evt, val, section, time: Date.now()}
          })
        }
      })
    }).then(({project, build}) => {
      console.log('BUILD DONE', project.name, build.id)
      this.emit('build:update', build)
      this.emit('build:status', {
        project: project.id,
        build: build.id,
        duration: build.duration,
        status: build.status
      })
      this.emit('build:done', {
        project: {
          id: project.id,
          name: project.name
        },
        build: {
          id: build.id,
          num: build.num,
          duration: build.duration,
          status: build.status
        }
      })
    }, error => {
      console.log('BUILD ERROR')
      console.log(error.message)
      console.log(error.stack)
      this.emit('build:error', {
        error,
      })
    })

    return {io, prom}
  }

  newConnection(socket) {
    const client = new Client(socket)
    this.clients.push(client)
    client.on('build:start', projectId => {
      this.startBuild(projectId, id => {
        console.log('STARTEED', id)
        this.unSub(client.openBuild, client)
        client.openBuild = id
        this.addSub(client.openBuild, client, true)
      })
    })

    client.on('build:view', id => {
      if (!this.builds.isRunning(id)) {
        return // not running
      }
      this.unSub(client.openBuild, client)
      client.openBuild = id
      this.addSub(client.openBuild, client)
      client.send('build:history', {
        id,
        project: this.builds.getProjectForBuild(id),
        events: aggEvents(this.builds.getBuildHistory(id))
      })
    })

    socket.on('close', () => {
      this.clients.splice(this.clients.indexOf(client), 1)
    })
  }

  emit(id, evt, val) {
    if (arguments.length === 2) {
      this.clients.forEach(c => c.send(id, evt))
      return val
    }
    if (!this.subs[id]) return
    this.subs[id].forEach(c => c.send(evt, val))
  }

  addSub(id, fn, force) {
    if (!this.builds.isRunning(id) && !force) return
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

  deleteProject(id) {
    return this.dao.deleteProject(id).then(() => {
      this.emit('project:remove', id)
      return id
    })
  }

  updateProject(id, data) {
    return this.dao.updateProject(id, data)
      .then(project => this.emit('project:update', project))
  }
}

