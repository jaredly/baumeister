
import React from 'react'
import {Route, DefaultRoute, NotFoundRoute} from 'react-router'

import App from './pages/app'
import Home from './pages/home'
import NotFound from './pages/not-found'

const routes = <Route handler={App} path="/">
  <DefaultRoute name="home" handler={Home}/>
  <Route name="project" path="/:project" handler={Home}/>
  <Route name="build" path="/:project/:build" handler={Home}/>
  <NotFoundRoute handler={NotFound}/>
</Route>

export default routes
