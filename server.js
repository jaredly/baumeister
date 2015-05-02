
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

setupManager(config)
  .then(({builds, clients, dao}) => {
    const views = makeViews(builds, clients, dao)
    const app = setupApp(config.server.port || 3005, views, clients)
    return loadPlugins(builds, app, config)
      .then(() => {
        console.log('plugins initialized')
        return app
      }, err => {
        console.error('Failed to load plugins')
        throw err
      })
  }, err => {
    console.error('failed to setup db + managers')
    throw err
  })
  .then(app => app.run(server => {
    console.log('ready')
  }), err => {
    console.log('Failed to initialize!')
    console.log(err.message)
    console.log(err.stack)
  })

