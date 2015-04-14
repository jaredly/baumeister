
import React from 'react'
import {Link} from 'react-router'
import Project from './project'

import './project.less'

export default class ProjectList extends React.Component {
  constructor() {
    this.state = {open: null}
  }

  componentDidMount() {
    if (!this.props.projects) {
      this.props.flux.getActions('projects').getProjects()
    }
  }

  render() {
    if (!this.props.projects) return <span>Loading</span>
    const projects = this.props.projects
      .valueSeq()
      .sort((a, b) => {
        return a.modified - b.modified
      })
    return <ul className='ProjectList'>
      {projects.map(proj => <li key={proj.id} className='ProjectList_project'>
        <Project
          onOpen={_ => this.setState({open: proj.id})}
          onClose={_ => this.setState({open: null})}
          isOpen={this.state.open === proj.id}
          flux={this.props.flux}
          project={proj}/>
      </li>)}
    </ul>
  }
}

