
import setupManager from '../lib'
import setupApp from '../app/back/setup'
import makeViews from '../app/back/views'
import loadPlugins from '../lib/load-plugins'

export default function setup(config) {
  return setupManager(config)
    .then(({builds, clients, plugins, dao}) => {
      const views = makeViews(builds, clients, dao)
      const app = setupApp(config.server && config.server.port || 3005, views, clients)
      return plugins.addFromConfig(app, config)
        .then(() => {
          builds.logger.info('plugins initialized')
          return {builds, plugins, clients, dao, app}
        }, err => {
          builds.logger.error('Failed to load plugins', err)
          throw err
        })
    }, err => {
      console.error('failed to setup db + managers')
      throw err
    })
}

