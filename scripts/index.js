
import React from 'react';
import Router from 'react-router'
import FluxComponent from 'flummox/component'

import routes from './routes';
import CiFlux from './stores'
import Api from './api'

const api = new Api()
const flux = new CiFlux(api)

const router = Router.create({
  routes,
  scrollBehavior: {
    updateScrollPosition: function () {}
  }
})

router.run(Handler => {
  React.render(<FluxComponent flux={flux} connectToStores={['config']}>
    <Handler api={api}/>
  </FluxComponent>, document.getElementById('root'));
})

