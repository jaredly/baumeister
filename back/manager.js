
import EventEmitter from 'eventemitter3'
import validate from 'tcomb-validation'
import uuid from './uuid'

export default class Runner extends EventEmitter {
  constructor(db, ws) {
    super()
    this.db = db
    this.ws = ws
  }

  addProject(data) {
    data.id = uuid()
    data.modifieed = new Date()
    const val = validate(data, Project)
    if (!val.isValid()) {
      return Promise.reject(new Error('Invalid project data: \n' + val.errors.map(e => e.message).join('\n')))
    }
    return this.db.put('projects', data.id, data)
      .then(() => data)
  }

  getProject(id) {
    const isId = +id.slice(0, 13) == id.slice(0, 13)
    if (isId) {
      return this.db.get('projects', id)
    }
    return this.db.find('projects', {name: id})
      .then(builds => builds[0])
  }

  getProjects() {
    return this.db.all('projects')
  }

  deleteProject(id) {
    return this.db.del('projects', id)
  }

  getBuilds(project) {
    return this.db.find('builds', {project})
  }

  startBuild(project) {
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

