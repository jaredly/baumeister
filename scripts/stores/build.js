
import {Store, Actions} from 'flummox'
import {List} from 'immutable'

class BuildActions extends Actions {
  constructor(api) {
    super()
    this.api = api
  }

  async getBuilds() {
    try {
      return await this.api.getBuilds()
    } catch (e) {
      console.error('failed to get builds')
      console.log(e)
      console.log(e.stack)
      throw e
    }
  }

  newBuild(build) {
    return build
  }
}

class BuildStore extends Store {
  constructor(flux) {
    super()
    const ids = flux.getActionIds('builds')
    this.register(ids.getBuilds, this.onBuilds)
    this.register(ids.newBuild, this.onNewBuild)
    this.state = {builds: null}
  }

  onBuilds(builds) {
    this.setState({builds: new List(builds)})
  }

  onNewBuild(build) {
    this.setState({
      builds: this.state.builds.unshift(build)
    })
  }
}

export {BuildStore, BuildActions}

