
import React from 'react'
import {RouteHandler, Link} from 'react-router'

import './app.less'

export default class App extends React.Component {
  render () {
    return <div className='App'>
      <header className='App_header'>
        <h1>CI</h1>
        <nav>
          <Link to="home">All builds</Link>
          <Link to="latest">Latest build</Link>
        </nav>
      </header>
      <section className='App_main'>
        <RouteHandler/>
      </section>
    </div>
  }
}

