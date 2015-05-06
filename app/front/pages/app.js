
import './app.less'

import React from 'react'
import {RouteHandler, Link} from 'react-router'
import classnames from 'classnames'

import mmSS from '../lib/mmSS'

import {fluxify} from 'flammable/react'
import AppConfig from '../components/app-config'
import Apparate from '../lib/apparate'


@fluxify({
  data: {
    ws: {
      state: 'connState',
    }
  }
})
export default class App extends React.Component {
  constructor(props) {
    super(props)
    this.state = {config: null}
  }

  toggleConfig() {
    this.setState({config: !this.state.config})
  }

  renderConnState() {
    const st = this.props.connState
    if (st === 'connecting') return <span className='App_conn App_conn-connecting'/>
    if (st === 'connected') return <span className='App_conn App_conn-connected'/>
    if (st === 'disconnected') return <span className='App_conn App_conn-disconnected'/>
    return <span className='App_conn'>Websocket disconnected....</span>
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

       <span className='App_flex'/>

       {this.renderConnState()}
      </header>
      <section className='App_main'>
        <Apparate>
        {this.state.config && <AppConfig onClose={() => this.setState({config: false})}/>}
        </Apparate>
        <RouteHandler/>
      </section>
    </div>
  }
}

