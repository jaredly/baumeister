
import Runner from './runner'
import EventEmitter from 'eventemitter3'
import validate from 'tcomb-validation'
import uuid from './uuid'

export default class Manager {
  constructor(db, basepath) {
    super()
    this.basepath = basepath
    this.db = db
    this.running = {}
    this.subs = {}
  }

  addProject(data) {
    data.id = uuid()
    data.modifieed = new Date()
    const val = validate(data, Project)
    if (!val.isValid()) {
      return Promise.reject(
        new Error('Invalid project data: \n' +
          val.errors.map(e => e.message).join('\n')))
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

  runBuild(project, data) {
    console.log('running', project, data)
    const r = new Runner(project, this.basepath)
    this.running[data.id] = r

    const this_ = this
    r.pipe({
      emit(evt, val) {
        this_.emit(data.id, evt, val)
      }
    })

    let status = 'unstarted'

    r.on('status', s => status = s)

    r.run(err => {
      console.log('Finished', data.id, err, status)
      if (status === 'test:failed') {
        data.status = 'failed'
      } else if (err) {
        data.status = 'errored'
      } else {
        data.status = 'succeeded'
      }
      data.events = r.history
      data.finished = new Date()
      this.db.put('builds', data.id, data)
        .then(_ => {
          this.running[data.id] = null
        })
    })
  }

  startBuild(id) {
    return this.getProject(id)
      .then(project => {
        if (!project) throw new Error('Project not found')
        return this.db.find('builds', {project: project.name})
          .then(builds => builds.length + 1)
          .then(num => {
            const data = {
              id: uuid(),
              project,
              started: Date.now(),
              finished: null,
              status: 'unstarted',
              num,
              events: [],
            }
            return this.db.put('builds', data.id, data)
              .then(() => {
                this.runBuild(project, data)
                return data.id
              })
          })
      })
  }

  emit(id, evt, val) {
    if (!this.subs[id]) return
    this.subs[id].forEach(f => f(id, evt, val))
  }

  addSub(id, fn) {
    if (!this.running[id]) return
    this.running[id].history.forEach(v => fn(id, v.evt, v.val))
    if (!this.subs[id]) this.subs[id] = [fn]
    else this.subs[id].push(fn)
  }

  unSub(id, fn) {
    const ix = this.subs[id].indexOf(fn)
    if (ix === -1) return false
    this.subs[id].splice(ix, 1)
    return true
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

