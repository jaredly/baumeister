
import React from 'react'
import ProjectConfig from './project-config'

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
    this.props.flux.getActions('projects').newProject(data)
  }

  render() {
    return <div className='Project NewProject'>
      <div className='Project_head NewProject_head'
        onClick={this.toggleOpen.bind(this)}
        >
        New Project
      </div>
      {this.state.open &&
        <ProjectConfig
          actionText='Create Project'
          project={{
            name: 'New Project',
            source: {
              provider: 'git',
              config: {
                repo: 'https://github.com/you/yours',
              },
            },
            build: {
              prefab: 'ubuntu',
            },
            test: {
              cwd: '',
              cmd: 'make test',
            }
          }}
          onOpen={_ => this.onOpen()}
          onClose={_ => this.onClose()}
          onSubmit={data => this.onSubmit(data)}
          />}
    </div>
  }
}

