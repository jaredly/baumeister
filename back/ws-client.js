
import EventEmitter from 'eventemitter3'

export default class Client extends EventEmitter {
  constructor(sock) {
    this.sock = sock
    this.sock.on('message', this._onMessage.bind(this))
  }

  send(evt, val) {
    this.sock.send(JSON.stringify({ evt, val }))
  }

  _onMessage(data) {
    try {
      data = JSON.parse(data)
    } catch (e) {
      return console.warn('NO PARSE', data)
    }
    if (!data.evt || data.val === undefined) {
      return console.error('Invalid format ws event', data)
    }
    this.emit(data.evt, data.val)
  }

}

