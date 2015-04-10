
import React from 'react'
import {Route, DefaultRoute, NotFoundRoute} from 'react-router'

import App from './pages/app'
import Home from './pages/home'
import Build from './pages/build'
import NotFound from './pages/not-found'

const routes = <Route handler={App} path="/">
  <DefaultRoute name="home" handler={Home}/>
  <Route name="latest" handler={Build}/>
  <Route name="build" path="/:buildNum" handler={Build}/>
  <NotFoundRoute handler={NotFound}/>
</Route>

export default routes
