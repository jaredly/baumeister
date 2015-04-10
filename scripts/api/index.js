
import EventEmitter from 'eventemitter3'
import {get, post} from './ajax'

export default class Api extends EventEmitter {
  constructor() {
    super()

    // TODO connect websocket
  }

  async getBuilds() {
    return await get('/api/builds')
  }
}

