
import {Store, Actions} from 'flummox'
import {List, Map} from 'immutable'

class ProjectActions extends Actions {
  constructor(api) {
    super()
    this.api = api
  }

  updateProject(data) {
    return this.api.updateProject(data)
  }

  clearCache(id) {
    return this.api.clearCache(id)
  }

  async getProjects() {
    try {
      return await this.api.getProjects()
    } catch (e) {
      console.error('failed to get projects')
      console.log(e)
      console.log(e.stack)
      throw e
    }
  }

  async startBuild(id) {
    try {
      return await this.api.startBuild(id)
    } catch (e) {
      console.error('failed to start build')
      console.log(e)
      console.log(e.stack)
      throw e
    }
  }

  newProject(project) {
    return this.api.newProject(project)
  }
}

class ProjectStore extends Store {
  constructor(flux) {
    super()
    const ids = flux.getActionIds('projects')
    this.register(ids.getProjects, this.onProjects)
    this.register(ids.newProject, this.onNewProject)
    this.state = {projects: null}
  }

  updateProject(project) {
    if ('string' === typeof project.latestBuild) {
      project.latestBuild = this.state.projects.get(project.id).latestBuild
    }
    this.setState({
      projects: this.state.projects.set(project.id, project)
    })
  }

  gotNewBuild(build) {
    this.setState({
      projects: this.state.projects.update(build.project, proj => {
        proj.latestBuild = build
        return proj
      })
    })
  }

  updateBuildStatus(project, build, status) {
    this.setState({
      projects: this.state.projects.update(project, proj => {
        if (!proj.latestBuild) {
          console.error('Updating status for a project with no latest build...')
          return proj
        }
        if (proj.latestBuild.id !== build) return proj
        proj.latestBuild.status = status
        return proj
      })
    })
  }

  onProjects(projects) {
    this.setState({projects: new Map(projects)})
  }

  onNewProject(project) {
    this.setState({
      projects: this.state.projects.set(project.id, project)
    })
  }
}

export {ProjectStore, ProjectActions}


