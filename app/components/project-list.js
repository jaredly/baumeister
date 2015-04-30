
import React from 'react'
import {Link} from 'react-router'
import {fluxify} from 'flammable/react'

import Project from './project'

import NewProject from './new-project'

@fluxify({
  data: {
    projects: 'projects',
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
    if (!this.props.projects || !Object.keys(this.props.projects).length) {
      return <span>Loading</span>
    }
    const projects = this.props.projects
    const names = Object.keys(this.props.projects).sort((a, b) => {
      return projects[b].latestBuild.started - projects[a].latestBuild.started
    })
    const open = this.context.router.getCurrentParams().project
    return <ul className='ProjectList'>
      {names.map(name => <li key={projects[name].id} className='ProjectList_project'>
        <Project
          onOpen={_ => this.onOpen(projects[name].id)}
          onClose={_ => this.onClose()}
          isOpen={open === projects[name].id}
          router={this.context.router}
          project={projects[name]}/>
      </li>)}
      <li className='ProjectList_project'>
        <NewProject/>
      </li>
    </ul>
  }
}

