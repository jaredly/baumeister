
import './app.less'

import React from 'react'
import {RouteHandler, Link} from 'react-router'
import FluxComponent from 'flummox/component'
import {Form, Radio} from '../lib/form'
import mmSS from '../lib/mmSS'
import classnames from 'classnames'


export default class App extends React.Component {
  constructor(props) {
    super(props)
    let focused = true
    window.addEventListener('focus', () => focused = true)
    window.addEventListener('blur', () => focused = false)
    props.api.on('build:done', data => {
      if (focused) return
      if (this.props.config.notifications === 'all') {
        const title = `Build ${data.build.num} for ${data.project.name} ${data.build.status}`
        const body = `Took ${mmSS(data.build.duration)}`
        const note = new Notification(title, {
          body,
          icon: `/static/icon-${data.build.status}.png`
        })
        setTimeout(_ => note.close(), 5000)
      }
    })
    this.state = {config: null}
  }

  toggleConfig() {
    this.setState({config: !this.state.config})
  }

  saveConfig(data) {
    this.props.flux.getActions('config').save(data)
    this.setState({config: false})
  }

  renderConfig() {
    return <FluxComponent connectToStores={{
      config: store => ({
        initialData: store.getConfig()
      })
    }}>
      <Form className='GlobalConfig' onSubmit={this.saveConfig.bind(this)}>
        <h1>Global Configuration</h1>
        <Radio
          name=''
          title='Notifications'
          switchOn='notifications'
          defaultData={{
            all: {notifications: 'all'},
            none: {notifications: 'none'},
            failures: {notifications: 'failures'},
          }}
          choices={{
            all: 'All',
            none: 'None',
            failures: 'Failures'
          }}
          >
          {null}
        </Radio>
        <button className='Button GlobalConfig_save'>Save</button>
      </Form>
    </FluxComponent>
  }

  render () {
    return <div className='App'>
      <header className='App_header'>
        <h1>Jaeger</h1>
        {/*
        <nav>
          <Link to="home">All builds</Link>
          <Link to="latest">Latest build</Link>
        </nav>
        */}
       <button className={classnames('App_header_button', this.state.config && 'App_header_button-active')} onClick={_ => this.toggleConfig()}>Config</button>
      </header>
      <section className='App_main'>
        {this.state.config && this.renderConfig()}
        <RouteHandler/>
      </section>
    </div>
  }
}

