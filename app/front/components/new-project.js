
import React from 'react'
import ProjectConfig from './project-config'
import classnames from 'classnames'
import {fluxify} from 'flammable/react'

import globalConfig from '../../../config'
import './new-project.less'

@fluxify({
  actions: {
    onSubmit: 'projects.create'
  }
})
export default class NewProject extends React.Component {
  constructor(props) {
    super(props)
    this.state = {open: false}
  }

  toggleOpen() {
    this.setState({open: !this.state.open})
  }

  onOpen() {
    this.setState({open: true})
  }

  onClose() {
    this.setState({open: false})
  }

  onSubmit(data) {
    this.setState({open: false})
    this.props.onSubmit(data)
  }

  render() {
    return <div className={classnames('Project NewProject', this.state.open && 'Project-open')}>
      <div className='Project_head NewProject_head'
        onClick={this.toggleOpen.bind(this)}
        >
        <i className='fa fa-plus'/>
        New Project
      </div>
      {this.state.open &&
        <ProjectConfig
          actionText='Create Project'
          creating={true}
          project={{
            name: 'New Project',
            plugins: {},
            builder: {
              id: globalConfig.defaultBuilder,
            },
          }}
          onOpen={_ => this.onOpen()}
          onClose={_ => this.onClose()}
          onSubmit={data => this.onSubmit(data)}
          />}
    </div>
  }
}

