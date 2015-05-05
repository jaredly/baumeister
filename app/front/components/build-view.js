
import React from 'react'
import {Link} from 'react-router'
import classnames from 'classnames'
import {fluxify} from 'flammable/react'

import Build from './build'

import './build-view.less'

function newBuilds(prev, next) {
  if (!next) return false
  if (!prev) return true
  if (next.length !== prev.length) return true
  for (let i=0; i<prev.length; i++) {
    if (prev[i].id !== next[i].id) return true
  }
  return false
}

@fluxify({
  data(props) {
    return {
      builds: {
        [props.projectId]: 'builds',
      }
    }
  },
  actions(props) {
    return {
      getBuilds: ['builds.fetch', props.projectId],
      setOpenBuild: 'builds.setOpen',
      stopBuild: ['builds.stop', props.projectId],
      startBuild: ['projects.startBuild', props.projectId],
    }
  }
})
export default class BuildView extends React.Component {
  componentDidMount() {
    if (this.props.builds) {
      this.setOpenBuild(null)
    }
    this.props.getBuilds()
  }

  componentWillReceiveProps(nextProps) {
    let news = false
    if (newBuilds(this.props.builds, nextProps.builds)) return this.setOpenBuild(null, nextProps.builds)
    /*
    if (nextProps.builds === this.props.builds) return
    if (!nextProps.builds) return
    this.setOpenBuild(null, nextProps.builds)
    */
  }

  setOpenBuild(id, builds) {
    const build = this.getCurrentBuild(id, builds)
    if (!build) return console.warn('tried to open unknown build', id)
    this.props.setOpenBuild(build.id)
    // this.props.flux.getActions('builds').setOpenBuild(build.id)
    if (id) {
      this.props.router.replaceWith('build', {
        project: build.project, build: id})
    } else {
      this.props.router.replaceWith('project', {
        project: build.project})
    }
  }

  onStop(build) {
    this.props.stopBuild(build.id)
    // this.props.flux.getActions('builds').stopBuild(build.project, build.id)
  }

  getCurrentBuild(id, builds) {
    if (!arguments.length) {
      id = this.props.router.getCurrentParams().build
    }
    builds = builds || this.props.builds
    if (!id) {
      return builds[0]
    }
    for (let i=0; i<builds.length; i++) {
      if (builds[i].id === id) return builds[i]
    }
    throw new Error('id not found')
  }

  static contextTypes = {
    router: React.PropTypes.func
  }

  render() {
    if (!this.props.builds) {
      return <span className='BuildView BuildView-loading'>Loading</span>
    }
    if (!this.props.builds.length) {
      return <div className='BuildView BuildView-empty'>
        No builds for this project!
        <button onClick={this.props.startBuild} type='button' className='Button'>
          Start a build
        </button>
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
            key={build.id}
            onClick={_ => this.setOpenBuild(build.id)}
            className={classnames('BuildView_icon', 'BuildView_icon-' + build.status, build.id === current.id && 'BuildView_icon-active')}>
          {build.num}
        </li>)}
      </ul>
    </div>
  }
}

