
import React from 'react'
import {Link} from 'react-router'
import FluxComponent from 'flummox/component'
import classnames from 'classnames'

import Ticker from '../lib/ticker'

import BuildView from './build-view'
import ProjectConfig from './project-config'

import './project.less'

function smallT(ms) {
  if (!ms) return ''
  if (ms < 100) return ms + 'ms'
  if (ms < 1000) return parseInt(ms / 10) / 100 + 's'
  if (ms < 10 * 1000) return parseInt(ms / 100) / 10 + 's'
  if (ms < 100 * 1000) return parseInt(ms / 1000) + 's'
  if (ms < 10 * 60 * 1000) return parseInt(ms / 1000) / 60 + 'm'
  if (ms < 100 * 60 * 1000) return parseInt(ms / (60 * 1000)) + 'm'
  return '>1h'
}

export default class Project extends React.Component {
  constructor(props) {
    super(props)
    this.state = {config: false}
  }

  _startBuild() {
    this.props.onOpen()
    this.props.flux.getActions('projects').startBuild(this.props.project.id)
  }

  _toggleOpen() {
    if (this.props.isOpen) {
      this.props.onClose()
    } else {
      this.props.onOpen()
    }
  }

  onCloseConfig() {
    this.setState({config: false})
  }

  onConfig(data) {
    this.props.flux.getActions('projects').updateProject(data)
  }

  onClear() {
    this.props.flux.getActions('projects').clearCache(this.props.project.id)
  }

  renderBody() {
    if (this.state.config) {
      return <ProjectConfig
        actionText='Save'
        onClear={this.onClear.bind(this)}
        onSubmit={this.onConfig.bind(this)} onClose={this.onCloseConfig.bind(this)} project={this.props.project}/>
    }
    return   <FluxComponent flux={this.props.flux} connectToStores={{
      builds: store => ({
        builds: store.getBuilds(this.props.project.id)
      })
    }}>
      <BuildView
        router={this.props.router}
        project={this.props.project}/>
    </FluxComponent>
  }

  openConfig(e) {
    e.preventDefault()
    e.stopPropagation()
    this.setState({config: true})
  }

  render () {
    const project = this.props.project
    return <div className={classnames('Project', this.props.isOpen && 'Project-open')}>
      <div onClick={this._toggleOpen.bind(this)} className='Project_head'>
        <span className={classnames('Project_status', 'Project_status-' + (project.latestBuild ? project.latestBuild.status : 'inactive'))}>
          {project.latestBuild && (
            project.latestBuild.status === 'running' ?
              <i className='fa fa-cog fa-spin'/>
            : smallT(project.latestBuild.duration))}
        </span>
        <span className='Project_name'>{project.name}</span>
        <span className='flex-spacer'/>
        {project.latestBuild && project.latestBuild.status === 'running' ?
          <Ticker className='Project_ticker' start={project.latestBuild.started}/> : null}
        {(!project.latestBuild || project.latestBuild.status !== 'running') ? <button className="Project_start" onClick={ e => {e.preventDefault();e.stopPropagation();this._startBuild()} }>
          <i className='fa fa-play'/>
        </button> : null}
      </div>
      {this.props.isOpen &&
        <div className='Project_body'>
          <div className='Project_buttons'>
            <button className={!this.state.config && 'active'} onClick={this.onCloseConfig.bind(this)}>Builds</button>
            <button className={this.state.config && 'active'} onClick={this.openConfig.bind(this)}>Config</button>
          </div>
          {this.renderBody()}
        </div>}
    </div>
  }
}

