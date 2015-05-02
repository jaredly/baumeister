
export default function loadPlugins(manager, app, config, done) {

  const plugins = {}
  Object.keys(config.plugins).forEach(name => {
    plugins[name] = new config.plugins[name](manager, app)
  })

  const builders = {}
  Object.keys(config.builders).forEach(name => {
    builders[name] = require(config.builders[name].builder)
  })

  manager.addBuilders(builders)
  return manager.addPlugins(plugins)
}

