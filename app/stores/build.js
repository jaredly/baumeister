
import {Store, Actions} from 'flummox'
import {List, Map} from 'immutable'
import aggEvents from '../../lib/agg-events'

class BuildActions extends Actions {
  constructor(api) {
    super()
    this.api = api
  }

  stopBuild(project, id) {
    return this.api.stopBuild(project, id)
  }

  setOpenBuild(id) {
    this.api.send('build:view', id)
  }

  async getBuilds(project) {
    try {
      const builds = await this.api.getBuilds(project)
      return {project, builds}
    } catch (e) {
      console.error('failed to get builds')
      console.log(e)
      console.log(e.stack)
      throw e
    }
  }
}

class BuildStore extends Store {
  constructor(flux) {
    super()
    const ids = flux.getActionIds('builds')
    this.register(ids.getBuilds, this.onBuilds)
    this.register(ids.newBuild, this.onNewBuild)
    this.state = {builds: new Map()}
  }

  onBuilds(builds) {
    this.setState({
      builds: this.state.builds.set(
        builds.project,
        new List(builds.builds))
    })
  }

  gotBuildHistory(id, project, events) {
    let build = this.state.builds.get(project).find(b => b.id === id)
    if (!build) {
      return console.warn('got history for unknown build', id, project)
    }
    build.events = events
    this.setState({
      builds: this.state.builds// .updateIn([project, ix], events)
    })
  }

  updateBuild(build) {
    let ix = this.state.builds.get(build.project).findIndex(b => b.id === build.id)
    if (ix === -1) return console.warn('got update for unknown build')
    this.setState({
      builds: this.state.builds.setIn([build.project, ix], build)
    })
  }

  getBuilds(id) {
    return this.state.builds.get(id)
  }

  gotNewBuildEvent(project, id, event) {
    let build = this.state.builds.get(project).find(b => b.id === id)
    if (!build) {
      return console.warn('got history for unknown build', id, project)
    }
    build.events = aggEvents([event], build.events)
    this.setState({
      builds: this.state.builds
      // .updateIn([project, ix], events)
    })
  }

  gotNewBuild(build) {
    this.setState({
      builds: this.state.builds
        .updateIn([build.project], l => l ? l.unshift(build) : new List([build]))
    })
  }
}

export {BuildStore, BuildActions}

