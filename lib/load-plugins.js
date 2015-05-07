
export default function loadPlugins(builds, clients, dao, app, config, done) {

  return dao.getConfig().then(userConfig => {

    const plugins = {}
    Object.keys(config.plugins).forEach(name => {
      let Plugin = config.plugins[name].plugin
      if ('string' === typeof Plugin) {
        Plugin = require(Plugin)
      }
      plugins[name] = new Plugin(userConfig.plugins[name], builds, clients, dao, app)
      plugins[name].buildTypes = config.plugins[name].buildTypes
    })

    const builderConfig = config.builderConfig || {}

    const builders = {}
    Object.keys(config.builders).forEach(id => {
      builders[id] = require(config.builders[id].builder)
      builders[id].globalConfig = builderConfig[id] || {}
    })

    builds.addBuilders(builders)
    builds.setDefaultBuilder(config.defaultBuilder)
    return builds.addPlugins(plugins)
  })
}

