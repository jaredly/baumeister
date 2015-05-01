
import assign from 'object-assign'

import config from './config'
import setupManager from './lib'
import makeViews from './app/back/views'
import setupApp from './app/back/setup'
import loadPlugins from './lib/load-plugins'

const defaults = {
  server: {
    port: process.env.PORT || 3005,
  },
  database: {
    path: process.env.DB || __dirname + '/.test.db',
  },
  builders: {},
  plugins: {},
}

for (let name in defaults) {
  if (!config[name]) {
    config[name] = defaults[name]
  } else {
    config[name] = assign(defaults[name], config[name])
  }
}

setupManager(config, manager => {
  const views = makeViews(manager)
  const app = setupApp(config.server.port || 3005, views, manager)

  loadPlugins(manager, app, config, () => {
    app.run(server => {
      console.log('ready')
    })
  })
})

