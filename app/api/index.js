
import EventEmitter from 'eventemitter3'
import assign from 'object-assign'

import {get, post} from './ajax'

export default class Api extends EventEmitter {
  constructor(host) {
    super()

    this.host = host
    this.open = false
    this.state = 'connecting'
    this.init()
  }

  setState(state) {
    this.state = state
    this.emit('ws:state', state)
  }

  init() {
    this.setState('connecting')
    let ws = new WebSocket('ws://' + this.host + '/api/ws')
    ws.addEventListener('open', () => {
      this.open = true
      this.setState('connected')
      this.ws = ws
      this.ws.addEventListener('message', this.onMessage.bind(this))
      this.ws.addEventListener('error', this.onError.bind(this))
      this.ws.removeEventListener('close', onClose)
      this.ws.addEventListener('close', this.onClose.bind(this))
    })
    let onClose = () => {
      this.setState('disconnected')
      console.log('no connection')
      setTimeout(() => {
        this.init()
      }, 1500)
    }
    ws.addEventListener('close', onClose)
  }

  send(evt, val) {
    if (!this.open) {
      return console.warn('not connected...')
    }
    const data = JSON.stringify({evt, val})
    this.ws.send(data)
  }

  onMessage(event) {
    const data = JSON.parse(event.data)
    this.emit(data.evt, data.val)
  }

  onClose() {
    console.warn('SOCKET CLSOED!')
    this.setState('disconnected')
    this.open = false
    setTimeout(() => {
      this.init()
    }, 1500)
  }

  onError(err) {
  }

  newProject(data) {
    return this.post('/api/projects/', data)
  }

  updateProject(id, data) {
    let payload = assign({}, data)
    if (payload.latestBuild && payload.latestBuild.id) {
      payload.latestBuild = payload.latestBuild.id
    }
    return this.post(`/api/projects/${id}`, payload)
  }

  stopBuild(project, id) {
    return this.post(`/api/builds/${project}/${id}/interrupt`)
  }

  saveConfig(config) {
    return this.post('/api/config', config)
  }

  fetchConfig() {
    return this.get('/api/config')
  }

  startBuild(id) {
    this.send('build:start', id)
  }

  clearCache(id) {
    return this.post(`/api/projects/${id}/clear-cache`)
      .then(_ => id)
  }

  getProjects() {
    return this.get('/api/projects?full=true')
  }

  getBuilds(projectId) {
    return this.get(`/api/builds/${projectId}`)
  }

  // utils
  post() {
    arguments[0] = 'http://' + this.host + arguments[0]
    return post.apply(null, arguments)
  }

  get() {
    arguments[0] = 'http://' + this.host + arguments[0]
    return get.apply(null, arguments)
  }
}

