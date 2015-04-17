
import React from 'react'

import BuildSection from './build-section'
import mmSS from '../lib/mmSS'

import './build.less'

export default class Build extends React.Component {

  render () {
    const build = this.props.build
    return <div className='Build'>
      <div className='Build_head'>
        <span className={'Build_status Build_status-' + build.status}>{build.status}</span>
        {build.duration && <span className='Build_time'> after {mmSS(build.duration)}</span>}
        {build.status === 'running' && <button className='Button' onClick={this.props.onStop}>Stop</button>}
      </div>

      <ul className='Build_sections'>
        {build.events ? build.events.sections.map(section =>
          <BuildSection
            section={section}
            streams={build.events.streams}/>) : 'Initializing...'}
      </ul>

    </div>
  }
}


