
import React from 'react'
import {Link} from 'react-router'
import Convert from 'ansi-to-html'
import classnames from 'classnames'

import './build.less'

function mmSS(ms) {
  let secs = parseInt(ms / 1000) % 60
  let min = parseInt(ms / 1000 / 60)
  ms %= 1000
  if (secs < 10) secs = '0' + secs
  if (ms < 10) ms = '00' + ms
  else if (ms < 100) ms = '0' + ms
  return `${min}:${secs}.${ms}s`
}

function ansiText(text) {
  text = text//.replace(/^[^\n]+\x1b\[[12]K/gm, '')
    .replace(/^[^\n]*\x1b\[\d*G/gm, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  return new Convert().toHtml(text)
}

class Ticker extends React.Component {
  constructor(props) {
    super(props)
    this.state = {dur: Date.now() - props.start}
    this._ival = setInterval(_ => {
      this.setState({dur: Date.now() - this.props.start})
    }, 83)
  }

  componentWillUnmount() {
    clearInterval(this._ival)
  }

  render() {
    return <span>{mmSS(this.state.dur)}</span>
  }
}

export default class Build extends React.Component {

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
    </li>
  }

  renderEvent(evt) {
    if (evt.evt === 'stream-start') {
      return this.renderStream(evt.val)
    }
    if (evt.evt === 'info') {
      return <li className='Evt Evt-info'>{evt.val}</li>
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
      </div>

      <ul className='Build_sections'>
        {build.events ? build.events.sections.map(section => this.renderSection(section)) : 'Initializing...'}
      </ul>

    </div>
  }
}


