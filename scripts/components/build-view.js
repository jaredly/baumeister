
import React from 'react'
import {Link} from 'react-router'
import FluxComponent from 'flummox/component'
import classnames from 'classnames'

import Build from './build'

import './build-view.less'

export default class BuildView extends React.Component {
  constructor() {
  }

  componentDidMount() {
    if (this.props.builds) {
      this.setOpenBuild(null)
    }
    setTimeout(() => {
      this.props.flux.getActions('builds')
        .getBuilds(this.props.project.id)
    }, 0)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.builds === this.props.builds) return
    if (!nextProps.builds) return
    this.setOpenBuild(null, nextProps.builds)
  }

  setOpenBuild(id, builds) {
    const build = this.getCurrentBuild(id, builds)
    if (!build) return console.warn('tried to open unknown build', id)
    this.props.flux.getActions('builds').setOpenBuild(build.id)
    if (id) {
      this.props.router.replaceWith('build', {
        project: build.project, build: id})
    } else {
      this.props.router.replaceWith('project', {
        project: build.project})
    }
  }

  onStop(build) {
    this.props.flux.getActions('builds').stopBuild(build.project, build.id)
  }

  getCurrentBuild(id, builds) {
    if (!arguments.length) {
      id = this.props.router.getCurrentParams().build
    }
    builds = builds || this.props.builds
    if (!id) {
      return builds.get(0)
    }
    return builds.find(b => b.id === id)
  }

  render() {
    if (!this.props.builds) {
      return <span>Loading</span>
    }
    if (!this.props.builds.size) {
      return <div className='BuildView'>
        No builds for this project!
      </div>
    }
    const current = this.getCurrentBuild()
    return <div className='BuildView'>
      <div className='BuildView_main'>
        <Build
          onStop={this.onStop.bind(this, current)}
          build={current}/>
      </div>
      <ul className='BuildView_right'>
        {this.props.builds.map(build => <li
            onClick={_ => this.setOpenBuild(build.id)}
            className={classnames('BuildView_icon', 'BuildView_icon-' + build.status, build.id === current.id && 'BuildView_icon-active')}>
          {build.num}
        </li>)}
      </ul>
    </div>
  }
}

BuildView.contextTypes = {
  router: React.PropTypes.func
}

