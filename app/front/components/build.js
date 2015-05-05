
import React from 'react'
import classnames from 'classnames'

import BuildSection from './build-section'
import mmSS from '../lib/mmSS'
import Ticker from '../lib/ticker'

import './build.less'

const errorRender = {
  server(error) {
    return <div className='BuildError_details'>
      <div className='BuildError_message'>{error.message}</div>
      {error.stack && <pre className='BuildError_traceback'>{error.stack}</pre>}
    </div>
  },
  configuration(error) {
    return <div className='BuildError_details'>
      <div className='BuildError_message'>
        <span className='BuildError_source'>{error.source}</span> {error.message}
      </div>
      {error.help && <div className='BuildError_help'>{error.help}</div>}
    </div>
  },
  zombie(error) {
    return <div className='BuildError_details'>
      <div className='BuildError_message'>{error.message}</div>
    </div>
  },
  'shell-exit': function (error) {
    return <div className='BuildError_details'>
      <div className='BuildError_cmd'>{error.cmd}</div>
      <div className='BuildError_exitCode'>exited with code {error.exitCode}</div>
    </div>
  },
  interrupted(error) {
    return <div className='BuildError_details'>
      Interrupted manually
    </div>
  },
}

export default class Build extends React.Component {

  renderError() {
    const build = this.props.build
    if (build.status !== 'errored' && build.status !== 'failed') return
    if (!build.errorCause) {
      build.errorCause = 'unknown'
    }
    if (!build.error) {
      build.error = {message: 'No error information'}
    }
    return <div className={'BuildError BuildError-' + build.status}>
      <div className='BuildError_title'>Build {build.status} ({build.errorCause} error)</div>
      {errorRender[build.errorCause](build.error)}
    </div>
  }

  render () {
    const build = this.props.build
    return <div className='Build'>
      <div className='Build_head'>
        <span className={'Build_status Build_status-' + build.status}>{build.status}</span>
        {build.duration && <span className='Build_after'> after <span className='Build_time'>{mmSS(build.duration)}</span> <Ticker ago className='Build_ago' start={build.finished}/> </span>}
        {build.status === 'running' && <button className='Button' onClick={this.props.onStop}>Stop</button>}
      </div>

      <ul className='Build_sections'>
        <ConfigSection config={build.config}/>
        {build.events ? build.events.sections.map(section =>
          <BuildSection
            key={section.name}
            section={section}
            finished={build.finished}
            streams={build.events.streams}/>) : (build.status === 'running' ? 'Initializing...' : '')}
      </ul>

      {this.renderError()}

    </div>
  }
}

class ConfigSection extends React.Component {
  constructor(props) {
    super(props)
    this.state = {open: false}
  }

  toggleOpen() {
    this.setState({open: !this.state.open, manuallyToggled: true})
  }

  render() {
    return <li className={classnames('Build_section', !this.state.open && 'Build_section-closed')}>
      <div onClick={this.toggleOpen.bind(this)} className='Build_section_title'>
        Config
      </div>
      {this.state.open && <ul className='Build_events'>
        <li>
          <pre className='Config_section'>{JSON.stringify(this.props.config, null, 2)}</pre>
        </li>
      </ul>}
    </li>
  }
}


