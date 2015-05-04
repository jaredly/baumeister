
import assign from 'object-assign'

import config from './config'
import setupManager from './lib'
import makeViews from './app/back/views'
import setupApp from './app/back/setup'
import loadPlugins from './lib/load-plugins'

import {argv} from 'yargs'
import repl from 'repl'

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

const cmd = argv._[0]

setupManager(config)
  .then(({builds, clients, dao}) => {
    const views = makeViews(builds, clients, dao)
    const app = setupApp(config.server.port || 3005, views, clients)
    return loadPlugins(builds, app, config)
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
  .then(({app, builds, clients, dao}) => {
    if (cmd === 'serve' || !cmd) {
      app.run(server => {
        console.log('ready')
      })
    } else if (cmd === 'repl') {
      global.app = app
      global.builds = builds
      global.clients = clients
      global.dao = dao
      repl.start({useGlobal: true})
    } else if (cmd === 'initdb') {
      loadDefaultProjects(dao)
    } else {
      return console.error('Unknown command', cmd)
    }
  }, err => {
    console.log('Failed to initialize!')
    console.log(err.message)
    console.log(err.stack)
  })

function loadDefaultProjects(dao) {
  const uuid = require('./lib/uuid')
  const projects = [
    require('./test/fixtures/loco.config.js'),
    require('./test/fixtures/itreed-js.config.js'),
    require('./test/fixtures/passes.config.js'),
    // require('./test/fixtures/notablemind.config.js'),
    require('./test/fixtures/test.config.js'),
  ]
  projects.forEach(proj => {
    proj.id = uuid()
    proj.status = 'inactive'
  })
  dao.getProjects().then(currents => {
    if (currents.length) {
      if (!(argv.f || argv.force)) {
        throw new Error('DB not empty!')
      }
      console.log('Deleting current projects')
      return Promise.all(currents.map(proj =>
                                      dao.deleteProject(proj.id)))
    }
  }).then(() => {
    return Promise.all(projects.map(proj => dao.addProject(proj)))
  }).then(() => {
    console.log('Done!')
  }, error => {
    console.log('An error occurred')
    console.log(error.message)
    console.log(error.stack)
  })
}

