
import {validate} from 'tcomb-validation'
import Promise from 'bluebird'
import async from 'async'

import prom from './prom'
import uuid from './uuid'
import {Project, Build} from './schema'

const DEFAULT_CONFIG = {
  notifications: 'none',
}

export default class Dao {
  constructor(db) {
    this.db = db
  }

  cleanUpZombies() {
    return this.getBuilds()
      .then(builds => {
        let zombies = builds.filter(b => b.status === 'running')
        if (!zombies) return
        console.log('cleaning up zombies')
        zombies.forEach(z => {
          z.finished = Date.now()
          z.status = 'errored'
          z.errorCause = 'zombie'
          z.error = {
            message: "Build was still running when server restarted",
          }
          // TODO give streams a stopping point?
        })
        return this.updateBuilds(zombies)
      })
  }

  getProjects() {
    return this.db.all('projects')
  }

  updateBuilds(builds) {
    return this.db.batch('builds', builds.map(z => ({type: 'put', key: z.id, value: z})))
  }

  getConfig() {
    return this.db.get('config', 'default')
      .catch(_ => DEFAULT_CONFIG)
  }

  setConfig(data) {
    console.log('save CONFIG', JSON.stringify(data, null))
    return this.db.put('config', 'default', data)
      .then(_ => data)
  }

  updateProject(id, data) {
    return this.getProject(id)
      .then(project => {
        for (let name in data) {
          project[name] = data[name]
        }
        project.modified = new Date()
        console.log('validate')
        const val = validate(project, Project)
        console.log(val, val.isValid)
        if (!val.isValid()) {
          console.log(JSON.stringify(val, null, 2))
          return Promise.reject(
            new Error('Invalid project data: \n' +
              val.errors.map(e => e.message).join('\n')))
        }
        return this.db.put('projects', id, project)
          .then(() => project)
      })
  }

  putProject(data) {
    return this.db.put('projects', data.id, data)
  }

  putBuild(data) {
    return this.db.put('builds', data.id, data)
  }

  addProject(data) {
    data.id = uuid()
    data.modified = new Date()
    const val = validate(data, Project)
    if (!val.isValid()) {
      console.log(JSON.stringify(val, null, 2))
      console.log(val.errors)
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
        .catch(err => {
          throw new Error(`Project not found "${id}"`)
        })
    }
    return this.db.find('projects', {name: id})
      .catch(err => {
        throw new Error('DB query for project failed')
      })
      .then(projects => {
        if (!projects.length) {
          throw new Error(`Project "${id}" not found`)
        }
        if (projects.length > 1) {
          throw new Error(`Multiple projects named "${id}"`)
        }
        return projects[0]
      })
  }

  getProjectsWithBuilds() {
    return this.db.all('projects')
      .then(projects => {
        const tasks = {}
        const pmap = {}
        projects.forEach(proj => {
          pmap[proj.id] = proj
          if (!proj.latestBuild) return
          tasks[proj.id] = next => this.db
            .nget('builds', proj.latestBuild, next)
        })
        return prom(done => {
          async.parallel(tasks, (err, res) => {
            if (err) return done(err)
            for (let name in res) {
              pmap[name].latestBuild = res[name]
            }
            done(null, pmap)
          })
        })
      })
  }

  getProjectMap() {
    return this.db.all('projects')
      .then(projects => {
        const pmap = {}
        projects.forEach(p => pmap[p.id] = p)
        return pmap
      })
  }

  deleteProject(id) {
    return this.db.del('projects', id)
  }

  getBuilds(project) {
    if (!project) {
      return this.db.all('builds')
    }
    return this.getProject(project)
      .then(proj => {
        return this.db.find('builds', {project: proj.id})
          .then(builds => builds.reduce((rev, n) => (rev.unshift(n), rev), []))
      })
  }

  getNewBuildInfo(id) {
    return this.getProject(id)
      .then(project => {
        if (!project) throw new Error('Project not found')
        return this.db.find('builds', {project: project.id})
          .then(builds => builds.length + 1)
          .then(num => {
            return {project, num}
          })
      })
  }

  getBuild(project, id) {
    const isNum = id == +id
    if (isNum) {
      return this.db.find('builds', {project, num: +id})
        .then(builds => builds[0])
    }
    return this.db.get('builds', id)
  }

  getNextBuildNumber(projectId) {
    return this.db.find('builds', {project: projectId})
      .then(builds => {
        let mx = 0
        builds.forEach(b => {
          if (b.num > mx) mx = b.num
        })
        return mx + 1
      })
  }

  deleteBuild(id) {
    return this.db.del('build', id)
  }
}

