
import {Flux} from 'flummox'
import {BuildActions, BuildStore} from './build'
import {ProjectActions, ProjectStore} from './project'

export default class CiFlux extends Flux {
  constructor(api) {
    super()

    const projects = this.createActions('projects', ProjectActions, api)
    const pstore = this.createStore('projects', ProjectStore, this)

    const builds = this.createActions('builds', BuildActions, api)
    const bstore = this.createStore('builds', BuildStore, this)

    api.on('build:new', build => {
      bstore.gotNewBuild(build)
      pstore.gotNewBuild(build)
    })
    api.on('build:status', data => pstore.updateBuildStatus(data.project, data.build, data.status))
    api.on('build:update', build => {
      bstore.updateBuild(build)
    })
    api.on('build:event', data => bstore.gotNewBuildEvent(data.project, data.build, data.event))
    api.on('build:history', data => {
      pstore.updateBuildStatus(data.project, data.id, 'running')
      bstore.gotBuildHistory(data.id, data.project, data.events)
    })
  }
}

