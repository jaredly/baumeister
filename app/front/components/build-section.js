
import React from 'react'

import Ticker from '../lib/ticker'
import mmSS from '../lib/mmSS'
import Convert from 'ansi-to-html'
import classnames from 'classnames'

import "./stream.less";
import "./events.less";

export default class BuildSection extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      manuallyToggled: false,
      open: props.section.name === 'test' || !props.section.end || props.section.errored,
      running: !props.section.end,
    }
  }

  componentWillReceiveProps(props) {
    let open = this.state.open
    if (props.section !== this.props.section) {
      if (!this.state.manuallyToggled) {
        open = props.section.name === 'test' || !props.section.end || props.section.errored
      }
      this.setState({
        open: open,
        running: !props.section.end,
      })
      return
    }
    if (props.section.name !== 'test' && props.section.end && this.state.running && !props.section.errored) {
      this.setState({open: this.state.manuallyToggled ? open : false, running: false})
    }
  }

  renderEvent(evt, i) {
    if (evt.evt === 'stream-start') {
      return renderStream(evt.val, this.props.streams[evt.val.id], i)
    }
    if (evt.evt === 'info') {
      return <li key={i} className='Evt Evt-info'>{evt.val}</li>
    }
    if (evt.evt === 'interrupt') {
      return <li key={i} className='Evt Evt-interrupt'>Build was interrupted</li>
    }
    if (evt.evt === 'dockerfile') {
      return <li key={i} className='Evt Evt-dockerfile Dockerfile'>
        <div className='Dockerfile_title'>Dockerfile</div>
        <pre>{evt.val.trim()}</pre>
      </li>
    }
    if (evt.evt === 'config-error') {
      return <li key={i} className='Evt Evt-config-error'>
        <span className='Evt-config-error-title'>Configuration Error</span>
        {evt.val}
      </li>
    }
    if (evt.evt === 'server-error') {
      return <li key={i} className='Evt Evt-server-error'>
        <span className='Evt-server-error-title'>Server Error</span>
        {evt.val}
      </li>
    }
    if (evt.evt === 'status') return
    return <li key={i} className='Evt'>{evt.evt}: {evt.val}</li>
  }

  toggleOpen() {
    this.setState({open: !this.state.open, manuallyToggled: true})
  }

  render() {
    const {section} = this.props
    if (!section || !section.items.length) return <span/>
    return <li className={classnames('Build_section', !this.state.open && 'Build_section-closed')}>
      <div onClick={this.toggleOpen.bind(this)} className='Build_section_title'>
        {section.name}
        <span className='Build_section_time'>
          {!section.end ? <Ticker start={section.start}/> : mmSS(section.duration)}
        </span>
      </div>
      {this.state.open && <ul className='Build_events'>
        {section.items.map((evt, i) => this.renderEvent(evt, i))}
      </ul>}
    </li>
  }
}

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

function renderStreamEnd(end) {
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
  return null
}

function renderStream(evt, stream, i) {
  if (!stream) return <span key={i}/>
  const title = evt.cleanCmd ? evt.cleanCmd : (evt.cmd ? evt.cmd : evt.title)
  const html = ansiText(stream.items.map(ev => ev.value).join(''))
  const dur = stream.end ? stream.end.duration : (Date.now() - stream.start.time)
  return <li className='Stream' key={i}>
    <div className='Stream_title'>
      {title}
      <span className='Stream_duration'>
        {stream.end ? mmSS(stream.end.duration) : <Ticker start={stream.start.time}/>}
      </span>
      <span className='Stream_plugin'>
        {evt.plugin}
      </span>
    </div>
    <div className='Stream_output' dangerouslySetInnerHTML={{__html: html}}/>
    {renderStreamEnd(stream.end)}
  </li>
}

