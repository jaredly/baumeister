
import {Flux} from 'flummox'
import {BuildActions, BuildStore} from './build'

export default class CiFlux extends Flux {
  constructor(api) {
    super()
    const builds = this.createActions('builds', BuildActions, api)
    this.createStore('builds', BuildStore, this)
    // api.listen(this.getActions('builds'))

    api.on('build:new', build => builds.newBuild(build))
  }
}

