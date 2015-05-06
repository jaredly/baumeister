
import setupManager from '../lib'
import setupApp from '../app/back/setup'
import makeViews from '../app/back/views'
import loadPlugins from '../lib/load-plugins'

export default function setup(config) {
  return setupManager(config)
    .then(({builds, clients, dao}) => {
      const views = makeViews(builds, clients, dao)
      const app = setupApp(config.server && config.server.port || 3005, views, clients)
      return loadPlugins(builds, clients, app, config)
        .then(() => {
          console.log('plugins initialized')
          return {builds, clients, dao, app}
        }, err => {
          console.error('Failed to load plugins')
          throw err
        })
    }, err => {
      console.error('failed to setup db + managers')
      throw err
    })
}

