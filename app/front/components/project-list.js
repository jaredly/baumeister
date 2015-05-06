
import React from 'react'
import {Link} from 'react-router'
import {fluxify} from 'flammable/react'

import Project from './project'

import NewProject from './new-project'

@fluxify({
  data: {
    projects: 'projects',
    projects$status: {
      _status: 'loadStatus',
      _error: 'loadError',
    },
  },
  actions: {
    getProjects: 'projects.fetch'
  }
})
export default class ProjectList extends React.Component {
  componentDidMount() {
    if (!this.props.projects || !Object.keys(this.props.projects).length) {
      this.props.getProjects()
    }
  }

  static contextTypes = {
    router: React.PropTypes.func
  }

  onOpen(id) {
    this.context.router.replaceWith('project', {project: id})
  }

  onClose() {
    this.context.router.replaceWith('home')
  }

  render() {
    if (this.props.loadStatus === 'unloaded' || this.props.loadStatus === 'loading') {
      return <span>Loading</span>
    }
    if (this.props.loadStatus === 'error') {
      return <span>Failed to load projects! Check your server log. {this.props.loadError}</span>
    }
    const projects = this.props.projects
    const names = Object.keys(this.props.projects).filter(name => projects[name]).sort((a, b) => {
      if (!projects[b].latestBuild) {
        if (!projects[a].latestBuild) return 0
        return -1
      }
      if (!projects[a].latestBuild) return 1
      if (projects[a].latestBuild.status === 'running') {
        if (projects[b].latestBuild.status === 'running') return 0
        return -1
      }
      if (projects[b].latestBuild.status === 'running') return 1
      return projects[b].latestBuild.finished - projects[a].latestBuild.finished
    })
    const open = this.context.router.getCurrentParams().project
    return <ul className='ProjectList'>
      {names.map(name => <li key={projects[name].id} className='ProjectList_project'>
        <Project
          onOpen={_ => this.onOpen(projects[name].id)}
          onClose={_ => this.onClose()}
          isOpen={open === projects[name].id}
          router={this.context.router}
          id={projects[name].id}/>
      </li>)}
      <li className='ProjectList_project'>
        <NewProject/>
      </li>
    </ul>
  }
}

