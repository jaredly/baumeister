
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

    this.ws = new WebSocket('ws://' + HOST + '/api/ws')
    this.ws.addEventListener('message', this.onMessage.bind(this))
    this.ws.addEventListener('error', this.onError.bind(this))
    this.ws.addEventListener('close', this.onClose.bind(this))

    // TODO connect websocket
  }

  send(evt, val) {
    const data = JSON.stringify({evt, val})
    this.ws.send(data)
  }

  onMessage(event) {
    const data = JSON.parse(event.data)
    this.emit(data.evt, data.val)
  }

  onError(err) {
  }

  onClose() {
  }

  updateProject(data) {
    let payload = assign({}, data)
    if (payload.latestBuild && payload.latestBuild.id) {
      payload.latestBuild = payload.latestBuild.id
    }
    return apost(`/api/projects/${data.id}`, payload)
  }

  startBuild(id) {
    return apost(`/api/builds/${id}`)
  }

  getProjects() {
    return aget('/api/projects?full=true')
  }

  getBuilds(project) {
    return aget(`/api/builds/${project}`)
  }
}

