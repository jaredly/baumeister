
import React from 'react'
import {Link} from 'react-router'

import Project from './project'

import NewProject from './new-project'


export default class ProjectList extends React.Component {
  componentDidMount() {
    if (!this.props.projects) {
      this.props.flux.getActions('projects').getProjects()
    }
  }

  onOpen(id) {
    this.context.router.replaceWith('project', {project: id})
  }

  onClose() {
    this.context.router.replaceWith('home')
  }

  render() {
    if (!this.props.projects) return <span>Loading</span>
    const projects = this.props.projects
      .valueSeq()
      .sort((a, b) => {
        return b.latestBuild.started - a.latestBuild.started
      })
    const open = this.context.router.getCurrentParams().project
    return <ul className='ProjectList'>
      {projects.map(proj => <li key={proj.id} className='ProjectList_project'>
        <Project
          onOpen={_ => this.onOpen(proj.id)}
          onClose={_ => this.onClose()}
          isOpen={open === proj.id}
          flux={this.props.flux}
          router={this.context.router}
          project={proj}/>
      </li>)}
      <li className='ProjectList_project'>
        <NewProject flux={this.props.flux}/>
      </li>
    </ul>
  }
}

ProjectList.contextTypes = {
  router: React.PropTypes.func
}
