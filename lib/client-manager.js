
import prom from './prom'
import aggEvents from '../lib/agg-events'
import Client from './ws-client'
import {Project, Build} from './schema'

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

  newConnection(socket) {
    const client = new Client(socket)
    this.clients.push(client)
    client.on('build:start', project => {
      this.startBuild(project, id => {
        this.unSub(client.openBuild, client)
        client.openBuild = id
        this.addSub(client.openBuild, client)
      })
    })

    client.on('build:view', id => {
      if (!this.builds.isRunning(id)) {
        return // not running
      }
      this.unSub(client.openBuild, client)
      client.openBuild = val
      this.addSub(client.openBuild, client)
      client.send('build:history', {
        id: val,
        project: this.builds.getProjectsWithBuilds(id),
        events: aggEvents(this.builds.getBuildHistory(id))
      })
    })

    socket.on('close', _ => {
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

  addSub(id, fn) {
    if (!this.builds.isRunning(id)) return
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
    return this.dao.deleteProject(id).then(_ => {
      this.emit('project:remove', id)
      return id
    })
  }

  updateProject(id, data) {
    return this.dao.updateProject(id, data)
      .then(project => this.emit('project:update', project))
  }
}

