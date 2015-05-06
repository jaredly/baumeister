
export default function loadPlugins(manager, clients, app, config, done) {

  const plugins = {}
  Object.keys(config.plugins).forEach(name => {
    plugins[name] = new config.plugins[name].plugin(manager, app, clients)
    plugins[name].buildTypes = config.plugins[name].buildTypes
  })

  const builderConfig = config.builderConfig || {}

  const builders = {}
  Object.keys(config.builders).forEach(id => {
    builders[id] = require(config.builders[id].builder)
    builders[id].globalConfig = builderConfig[id] || {}
  })

  manager.addBuilders(builders)
  manager.setDefaultBuilder(config.defaultBuilder)
  return manager.addPlugins(plugins)
}

