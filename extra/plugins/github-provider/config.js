
import React from 'react'
import {fluxify} from 'flammable/react'

@fluxify({
  actions: {
    getRepos: 'github-provider.getRepos',
  },
  data: {
    'github-provider': {
      repos: 'repos',
    }
  }
})
export default class GithubConfig extends React.Component {
  constructor(props) {
    super(props)
    this.state = {search: ''}
  }

  render() {
    if (this.props.value && this.props.value.get('repo')) {
      return <div>Drawing from repo: {this.props.value.get('repo')}</div>
    }
    if (!this.props.repos) {
      return <button type='button' onClick={this.props.getRepos}>Fetch Repository List</button>
    }
    const needle = this.state.search.toLowerCase()
    return <div>
      <input value={this.state.search} onChange={e => this.setState({search: e.target.value})}/>
      <ul>
        {this.props.repos.map(project => {
          if (needle && project.full_name.toLowerCase().indexOf(needle) === -1) return
          return <li>
            {project.full_name}
          </li>
        })}
      </ul>
    </div>
  }
}

