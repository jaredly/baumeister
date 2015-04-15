
import React from 'react'
import {Link} from 'react-router'
import Convert from 'ansi-to-html'
import classnames from 'classnames'

import Ticker from '../lib/ticker'
import mmSS from '../lib/mmSS'

import './build.less'

function ansiText(text) {
  text = text
    .replace(/^[^\n]*\r([^\n])/gm, '$1')
    .replace(/^[^\n]*\x1b\[\d*G/gm, '')
    .replace(/^[^\n]+\x1b\[[12]K/gm, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return new Convert().toHtml(text)
}

export default class Build extends React.Component {

  renderStreamEnd(end) {
    if (!end) {
      return <div className='Stream_end Stream_end-running'>
        Running...
      </div>
    }
    if (end.error) {
      return <div className='Stream_end Stream_end-error'>
        Failed! {end.error}
      </div>
    }
    return null /*<div className='Stream_end Stream_end-success'>
      Success!!
    </div>*/
  }

  renderStream(evt) {
    const title = evt.cmd ? evt.cmd : evt.title
    const stream = this.props.build.events.streams[evt.id]
    const html = ansiText(stream.items.map(ev => ev.value).join(''))
    const dur = stream.end ? stream.end.duration : (Date.now() - stream.start.time)
    return <li className='Stream'>
      <div className='Stream_title'>
        {title}
        <span className='Stream_duration'>
          {stream.end ? mmSS(stream.end.duration) : <Ticker start={stream.start.time}/>}
        </span>
      </div>
      <div className='Stream_output' dangerouslySetInnerHTML={{__html: html}}/>
      {this.renderStreamEnd(stream.end)}
    </li>
  }

  renderEvent(evt) {
    if (evt.evt === 'stream-start') {
      return this.renderStream(evt.val)
    }
    if (evt.evt === 'info') {
      return <li className='Evt Evt-info'>{evt.val}</li>
    }
    if (evt.evt === 'interrupt') {
      return <li className='Evt Evt-interrupt'>Build was interrupted</li>
    }
    if (evt.evt === 'dockerfile') {
      return <li className='Evt Evt-dockerfile Dockerfile'>
        <div className='Dockerfile_title'>Dockerfile</div>
        <pre>{evt.val.trim()}</pre>
      </li>
    }
    if (evt.evt === 'status') return
    return <li className='Evt'>{evt.evt}: {evt.val}</li>
  }

  renderSection(section) {
    return <li className='Build_section'>
      <div className='Build_section_title'>{section.name}</div>
      <ul className='Build_events'>
        {section.items.map(evt => this.renderEvent(evt))}
      </ul>
    </li>
  }

  render () {
    const build = this.props.build
    return <div className='Build'>
      <div className='Build_head'>
      {build.status === 'running' && <button onClick={this.props.onStop}>Stop</button>}
      </div>

      <ul className='Build_sections'>
        {build.events ? build.events.sections.map(section => this.renderSection(section)) : 'Initializing...'}
      </ul>

    </div>
  }
}


