
import EventEmitter from 'eventemitter3'

export default class Runner extends EventEmitter {
  constructor(db, ws) {
    super()
    this.db = db
    this.ws = ws
  }

  getBuilds(project) {
    return this.db.find('builds', {project})
  }

  startBuild(project) {
  }
}

