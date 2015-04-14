
import React from 'react'
import {Link} from 'react-router'
import FluxComponent from 'flummox/component'
import classnames from 'classnames'

import BuildView from './build-view'
import ProjectConfig from './project-config'

export default class Project extends React.Component {
  constructor(props) {
    super(props)
    this.state = {config: false}
  }

  _startBuild() {
    this.props.flux.getActions('projects').startBuild(this.props.project.id)
  }

  _toggleOpen() {
    if (this.props.isOpen) {
      this.props.onClose()
    } else if (!this.state.config) {
      this.props.onOpen()
    }
  }

  onCloseConfig() {
    this.setState({config: false})
  }

  renderBody() {
    if (this.state.config) {
      return <ProjectConfig onClose={this.onCloseConfig.bind(this)} flux={this.props.flux} project={this.props.project}/>
    }

    if (this.props.isOpen) {
      return <FluxComponent flux={this.props.flux} connectToStores={{
        builds: store => ({
          builds: store.getBuilds(this.props.project.id)
        })
      }}>
        <BuildView project={this.props.project}/>
      </FluxComponent>
    }

    return null
  }

  openConfig(e) {
    e.preventDefault()
    e.stopPropagation()
    this.setState({config: true})
    this.props.onClose()
  }

  render () {
    const project = this.props.project
    return <div className={classnames('Project', this.props.isOpen && 'Project-open')}>
      <div onClick={this._toggleOpen.bind(this)} className='Project_head'>
        <span className={classnames('Project_status', 'Project_status-' + (project.latestBuild ? project.latestBuild.status : 'inactive'))}></span>
        <span className='Project_name'>{project.name}</span>
        <span className='flex-spacer'/>
        {(!project.latestBuild || project.latestBuild.status !== 'running') ? <button onClick={ e => {e.preventDefault();e.stopPropagation();this._startBuild()} }>
          Start Build
        </button> : null}
        {!this.state.config && <button onClick={this.openConfig.bind(this)}>Config</button>}
      </div>
      {this.renderBody()}
    </div>
  }
}

