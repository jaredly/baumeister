
import React from 'react';
import Router from 'react-router'
import FluxComponent from 'flummox/component'

import routes from './routes';
import CiFlux from './stores'
import Api from './api'

Router.run(routes, Handler => {
  const api = new Api()
  const flux = new CiFlux(api)
  React.render(<FluxComponent flux={flux}>
    <Handler />
  </FluxComponent>, document.getElementById('root'));
})

