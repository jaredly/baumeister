
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
  static contextTypes = {
    router: React.PropTypes.func
  }

  toggleConfig() {
    const configOpen = this.context.router.getCurrentPathname() === '/config'
    if (configOpen) return this.context.router.replaceWith('home')
    return this.context.router.replaceWith('config')
  }

  renderConnState() {
    const st = this.props.connState
    if (st === 'connecting') return <span className='App_conn App_conn-connecting'/>
    if (st === 'connected') return <span className='App_conn App_conn-connected'/>
    if (st === 'disconnected') return <span className='App_conn App_conn-disconnected'/>
    return <span className='App_conn'>Websocket disconnected....</span>
  }

  render () {
    const configOpen = this.context.router.getCurrentPathname() === '/config'
    return <div className='App'>
      <header className='App_header'>
        <h1>Jaeger</h1>
        {/*
        <nav>
          <Link to="home">All builds</Link>
          <Link to="latest">Latest build</Link>
        </nav>
        */}
       <button className={classnames('App_header_button', configOpen && 'App_header_button-active')} onClick={_ => this.toggleConfig()}>Config</button>

       <span className='App_flex'/>

       {this.renderConnState()}
      </header>
      <section className='App_main'>
        <Apparate>
        {configOpen && <AppConfig onClose={() => this.toggleConfig()}/>}
        </Apparate>
        <RouteHandler/>
      </section>
    </div>
  }
}

