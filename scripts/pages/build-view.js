
import React from 'react'
import {Link} from 'react-router'
import FluxComponent from 'flummox/component'
import classnames from 'classnames'

import Build from './build'

import './build-view.less'

export default class BuildView extends React.Component {
  constructor() {
    this.state = {active: 0}
  }

  componentDidMount() {
    if (this.props.builds) {
      this.setOpenBuild(0)
    }
    this.props.flux.getActions('builds').getBuilds(this.props.project.id)
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.builds === this.props.builds) return
    if (!nextProps.builds) return
    this.setOpenBuild(0, nextProps.builds)
  }

  setOpenBuild(i, builds) {
    builds = builds || this.props.builds
    const build = builds.get(i)
    if (!build) return console.warn('tried to open build at unknown index', i, builds.toJS())
    this.props.flux.getActions('builds').setOpenBuild(build.id)
    this.setState({active: i})
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
    return <div className='BuildView'>
      <div className='BuildView_main'>
        <Build build={this.props.builds.get(this.state.active)}/>
      </div>
      <ul className='BuildView_right'>
        {this.props.builds.map((build, i) => <li
            onClick={_ => this.setOpenBuild(i)}
            className={classnames('BuildView_icon', 'BuildView_icon-' + build.status, i === this.state.active && 'BuildView_icon-active')}>
          {build.status}
        </li>)}
      </ul>
    </div>
  }
}

