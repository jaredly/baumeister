
import React from 'react'
import {fluxify} from 'flammable/react'
import {Map} from 'immutable'

import RCSS from 'rcss'
import css from '../../../app/front/lib/css'

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

  onSelect(name) {
    const val = this.props.value || Map()
    this.props.onChange(val.set('repo', name))
  }

  componentDidUpdate(prevProps) {
    if (this.props.repos && !prevProps.repos) {
      this.maxHeight = React.findDOMNode(this).offsetHeight
    }
  }

  onKeyDown(ev) {
    if (ev.key !== 'Enter') {
      return
    }
    ev.preventDefault()

    const needle = this.state.search.toLowerCase()
    let first
    this.props.repos.some(repo => {
      if (needle && repo.full_name.toLowerCase().indexOf(needle) === -1) return
      first = repo
      return true
    })
    if (!first) return
    this.onSelect(first.full_name)
  }

  render() {
    if (this.props.value && this.props.value.get('repo')) {
      return <div className={styles.main}>
        Drawing from repo: {this.props.value.get('repo')}
        <button type='button' className='Button' onClick={this.onSelect.bind(this, null)}>Unset</button>
      </div>
    }
    if (!this.props.repos) {
      return <div className={styles.main}>
        <button type='button' className='Button' onClick={this.props.getRepos}>Fetch Repository List</button>
      </div>
    }

    const needle = this.state.search.toLowerCase()
    return <div className={styles.main}>
      <input autoFocus onKeyDown={this.onKeyDown.bind(this)} value={this.state.search} onChange={e => this.setState({search: e.target.value})}/>
      <ul style={{
        height: this.maxHeight,
      }} className={styles.list}>
        {this.props.repos.map(project => {
          if (needle && project.full_name.toLowerCase().indexOf(needle) === -1) return
          return <li key={project.full_name}
                     onClick={this.onSelect.bind(this, project.full_name)}
                     className={styles.item}>
            {project.full_name}
          </li>
        })}
      </ul>
    </div>
  }
}

const {styles, decs} = css`
main {
  padding: 10px
}
list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 400px;
  overflow: auto;
}
item {
  padding: 5px 10px
  transition: background-color .2s ease
  cursor: pointer
  :hover {
    background-color: #ddd;
  }
}
`

if (module.hot) {
  module.hot.accept()
  RCSS.injectAll()
}
