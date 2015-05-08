
import prom from './prom'
import assign from 'object-assign'
import {ConfigError, InterruptError, ShellError, FailError} from './errors'

export default class PluginManager {
  constructor(io, dao, logger) {
    this.io = io
    this.dao = dao
    this.logger = logger

    this.plugins = {}
    this.projectPlugins = {}
    this.builders = {}

    io.on('project:update', project => {
      this.handleProjectUpdate(project.id, project)
    })
    io.on('config:save', value => {
      // TODO notify plugins that their config has changed
      Object.keys(this.plugins).forEach(name => {
        if (this.plugins[name].onConfig) {
          this.plugins[name].onConfig(value.plugins[name])
        }
      })
    })
    io.on('project:delete', project => {
      // TODO test offProject for deleted projects
      const id = project.id
      // offProject for plugins
      Object.keys(this.plugins).forEach(name => {
        if (!this.projectPlugins[name]) {
          this.projectPlugins[name] = {}
        }
        const oldConfig = this.projectPlugins[name][id]
        this.projectPlugins[name][id] = null
        if (!this.plugins[name].offProject) return
        this.plugins[name].offProject(project, oldConfig)
      })
    })
  }

  addBuilders(builders) {
    this.builders = assign(this.builders, builders)
  }

  setDefaultBuilder(builderId) {
    if (!this.builders[builderId]) {
      throw new ConfigError(`Invalid default builder: ${builderId} not found`, 'config.defaultBuilder')
    }
    this.defaultBuilder = builderId
  }

  getBuilder(id) {
    return this.builders[id]
  }

  pluginProxy(id, app) {
    const prefix = `/plugins/${id}`
    const man = this
    return {
      app: {
        url(path) {
          return 'http://localhost:3005' + prefix + path
        },
        post() {
          arguments[0] = prefix + arguments[0]
          app.get.apply(app, arguments)
        },
        del() {
          arguments[0] = prefix + arguments[0]
          app.get.apply(app, arguments)
        },
        put() {
          arguments[0] = prefix + arguments[0]
          app.get.apply(app, arguments)
        },
        get() {
          arguments[0] = prefix + arguments[0]
          app.get.apply(app, arguments)
        },
        use() {
          if ('string' === typeof arguments[0]) {
            arguments[0] = prefix + arguments[0]
          }
          app.get.apply(app, arguments)
        },
        root: app,
      },
      setConfig(value) {
        return man.dao.setPluginConfig(id, value)
      },
      setCache(value) {
        return man.dao.setPluginCache(id, value)
      },
      getCache() {
        return man.dao.getPluginCache(id).catch(err => false)
      },
      startBuild(project) {
        man.io.emit('start build', project)
      },
      logger: this.logger
    }
  }

  addFromConfig(app, appConfig) {

    return this.dao.getConfig().then(userConfig => {

      const plugins = {}
      Object.keys(appConfig.plugins).forEach(name => {
        let Plugin = appConfig.plugins[name].plugin
        if ('string' === typeof Plugin) {
          Plugin = require(Plugin)
        }
        plugins[name] = new Plugin(userConfig.plugins[name], this.pluginProxy(name, app))
        plugins[name].buildTypes = appConfig.plugins[name].buildTypes
      })

      const builderConfig = appConfig.builderConfig || {}

      const builders = {}
      Object.keys(appConfig.builders).forEach(id => {
        builders[id] = require(appConfig.builders[id].builder)
        builders[id].globalConfig = builderConfig[id] || {}
      })

      this.addBuilders(builders)
      this.setDefaultBuilder(appConfig.defaultBuilder)
      return this.addPlugins(plugins)
    })

  }

  getBuilderConfig(project, userConfig) {
    let id = this.defaultBuilder
    let globalConfig = {}, localConfig = {}
    if (project.builder && project.builder.id) {
      localConfig = project.builder.config
      id = project.builder.id
    }
    if (!this.builders[id]) {
      throw new ConfigError(`Unknown builder "${id}" configured for this project`)
    }
    if (userConfig.builders && userConfig.builders[id]) {
      globalConfig = userConfig.builders[id]
    } else {
      globalConfig = this.builders[id].globalConfig
    }
    return {id, globalConfig, localConfig}
  }

  addPlugins(plugins) {
    let names = Object.keys(plugins)
    this.plugins = assign(this.plugins, plugins)
    return this.dao.getProjects().then(projects => projects.forEach(project => names.forEach(name => {
      if (!project.plugins || !project.plugins[name]) return
      if (!this.projectPlugins[name]) {
        this.projectPlugins[name] = {}
      }
      this.projectPlugins[name][project.id] = project.plugins[name]
      if (!plugins[name].onProject) return
      plugins[name].onProject(project, project.plugins[name])
    })))
  }

  handleProjectUpdate(id, project) {
    Object.keys(this.plugins).forEach(name => {
      if (!this.projectPlugins[name]) {
        this.projectPlugins[name] = {}
      }
      if (this.projectPlugins[name][id]) {
        if (project.plugins[name]) return
        const oldConfig = this.projectPlugins[name][id]
        this.projectPlugins[name][id] = null
        if (!this.plugins[name].offProject) return
        this.plugins[name].offProject(project, oldConfig)
      } else if (project.plugins[name]) {
        this.projectPlugins[name][id] = project.plugins[name]
        if (!this.plugins[name].onProject) return
        this.plugins[name].onProject(project, project.plugins[name])
      }
    })
  }

  updateProjectFromBuild(project, build) {
    return prom(done => {
      const pluginData = assign({}, project.pluginData)
      let changed = false
      Object.keys(project.plugins).forEach(name => {
        if (!this.plugins[name].projectDataFromBuild) return
        changed = true
        pluginData[name] = this.plugins[name].projectDataFromBuild(build, project.plugins[name],
                                                                  project.pluginData[name], project)
      })
      if (!changed) return done()
      this.dao.updateProject(project.id, {pluginData})
        .then(updatedProject => {
          this.io.emit('project:update', updatedProject)
          done()
        }, done)
    })
  }

  onBuild(project, build, builderType, runner) {
    Object.keys(project.plugins).forEach(id => {
      const plugin = this.plugins[id]
      if (!plugin) {
        throw new ConfigError(`Plugin ${id} is not installed`,
          'plugins', 'Add it to your config.json in the base of the jaeger installation directory.')
      }
      if (plugin.buildTypes && plugin.buildTypes.indexOf(builderType) === -1) {
        throw new ConfigError(`Plugin ${id} is incompatible with builder ${builderType}`)
      }
      if (!plugin.onBuild) return
      plugin.onBuild(
        project,
        build,
        wrapPluginStep(id, runner),
        project.plugins[id])
    })
  }

  offBuild(project, build) {
  }

  doPlugins(name, project, ...args) {
    if (!project.plugins) return
    Object.keys(project.plugins).forEach(id => {
      const plugin = this.plugins[id]
      if (!plugin) {
        throw new ConfigError(`Plugin ${id} not configured.`, 'project.plugins')
      }
      if (!plugin[name]) return
      const params = [project].concat(args)
        .concat([project.plugins[id]])
      plugin[name].apply(plugin, params)
    })
  }
}

function wrapPluginStep(id, runner) {
  return function (step, fn, prepend) {
    return runner.use(step, function (builder, ctx, io) {
      return fn.call(this, builder.pluginProxy(id), ctx, io)
    }, prepend)
  }
}

