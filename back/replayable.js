
import EventEmitter from 'eventemitter3'

export default class Replayable extends EventEmitter {
  constructor() {
    this.history = []
    this.piping = []
  }

  pipe(em) {
    // replay the past
    this.history.forEach(v => em.emit(v.evt, v.val))
    this.piping.push(em)
  }

  unpipe(em) {
    const ix = this.piping.indexOf(em)
    if (ix === -1) return false
    this.piping.splice(ix, 1)
    return true
  }

  on(evt, fn) {
    EventEmitter.prototype.on.call(this, evt, fn)
  }

  emit(evt, val) {
    this.history.push({evt, val, time: Date.now()})
    this.piping.forEach(p => p.emit(evt, val))
    EventEmitter.prototype.emit.call(this, evt, val)
  }
}
