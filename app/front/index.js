
import React from 'react';
import Router from 'react-router'
import RCSS from 'rcss'

import setupFlux from './flux'
import routes from './routes';

import appConfig from '../../config'

const flux = setupFlux({
  apiHost: 'localhost:3005',
  plugins: appConfig.plugins,
})

const router = Router.create({
  routes,
  scrollBehavior: {
    updateScrollPosition: function () {}
  }
})

router.run(Handler => {
  const root = document.getElementById('root')
  React.render(flux.wrap(<Handler/>), root);
  RCSS.injectAll()
})

if (module.hot) {
  module.hot.accept('../../config', () => {
    RCSS.injectAll()
  })

  module.hot.accept('./routes', () => {
    RCSS.injectAll()
  })
}


