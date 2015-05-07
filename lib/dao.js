
import {validate} from 'tcomb-validation'
import Promise from 'bluebird'
import async from 'async'

import prom from './prom'
import uuid from './uuid'
import {Project, Build} from './schema'
import appConfig from '../config'

function specToDefaults(spec) {
  const res = {}
  Object.keys(spec).forEach(name => {
    if (spec[name].type === 'section') {
      res[name] = specToDefaults(spec[name].spec)
    } else {
      res[name] = spec[name].default
    }
  })
  return res
}

const DEFAULT_CONFIG = {
  notifications: 'none',
  builders: {},
  plugins: {},
}

Object.keys(appConfig.builders).forEach(name => {
  const builder = appConfig.builders[name]
  if (!builder.globalConfig) return
  DEFAULT_CONFIG.builders[name] = specToDefaults(builder.globalConfig.schema)
})

Object.keys(appConfig.plugins).forEach(name => {
  const plugin = appConfig.plugins[name]
  if (!plugin.globalConfig) return
  DEFAULT_CONFIG.plugin[name] = specToDefaults(plugin.globalConfig.schema)
})

export default class Dao {
  constructor(io, db, logger) {
    this.io = io
    this.db = db
    this.logger = logger || console
  }

  cleanUpZombies() {
    return this.getBuilds()
      .then(builds => {
        let zombies = builds.filter(b => b.status === 'running')
        if (!zombies) return
        this.logger.info('cleaning up zombies')
        zombies.forEach(z => {
          z.finished = Date.now()
          z.status = 'errored'
          z.errorCause = 'zombie'
          z.error = {
            message: "Build was still running when server restarted",
          }
          // TODO stop streams
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
    this.logger.info('save CONFIG', JSON.stringify(data, null))
    this.io.emit('config:save', data)
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
        project.pluginData = project.pluginData || {}
        const val = validate(project, Project)
        if (!val.isValid()) {
          this.logger.warn(JSON.stringify(val, null, 2))
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
    data.pluginData = data.pluginData || {}
    data.plugins = data.plugins || {}
    const val = validate(data, Project)
    if (!val.isValid()) {
      this.logger.warn(JSON.stringify(val, null, 2))
      this.logger.warn(val.errors)
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

  getBuild(project, id) {
    const isNum = id == +id
    if (isNum) {
      return this.db.find('builds', {project, num: +id})
        .then(builds => {
          if (!builds.length) throw new Error(`Build #${id} not found`)
          return builds[0]
        })
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
    return this.db.del('builds', id)
  }
}

