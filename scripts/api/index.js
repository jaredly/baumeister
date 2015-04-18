
import EventEmitter from 'eventemitter3'
import assign from 'object-assign'

import {get, post} from './ajax'

const HOST = 'localhost:3005'

const apost = function () {
  arguments[0] = 'http://' + HOST + arguments[0]
  return post.apply(this, arguments)
}

const aget = function () {
  arguments[0] = 'http://' + HOST + arguments[0]
  return get.apply(this, arguments)
}

export default class Api extends EventEmitter {
  constructor() {
    super()

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
    let ws = new WebSocket('ws://' + HOST + '/api/ws')
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
    return apost('/api/projects/', data)
  }

  updateProject(data) {
    let payload = assign({}, data)
    if (payload.latestBuild && payload.latestBuild.id) {
      payload.latestBuild = payload.latestBuild.id
    }
    return apost(`/api/projects/${data.id}`, payload)
  }

  stopBuild(project, id) {
    return apost(`/api/builds/${project}/${id}/interrupt`)
  }

  saveConfig(config) {
    return apost('/api/config', config)
  }

  fetchConfig() {
    return aget('/api/config')
  }

  startBuild(id) {
    this.send('build:start', id)
  }

  clearCache(id) {
    return apost(`/api/projects/${id}/clear-cache`)
  }

  getProjects() {
    return aget('/api/projects?full=true')
  }

  getBuilds(project) {
    return aget(`/api/builds/${project}`)
  }
}

