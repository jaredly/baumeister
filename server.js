
import assign from 'object-assign'
import {EventEmitter} from 'events'
import {argv} from 'yargs'
import repl from 'repl'

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
    } else if (cmd === 'build') {
      consoleBuild(builds, clients, argv._[1])
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

const showEvent = {
  'build:new': val => console.log(`# Build created ${val.id}`),
  'build:update': val => {
    if (val.status === 'running') return
    if (val.status === 'succeeded') {
      return console.log(`#### Build Passed! ####`)
    }
    if (val.status === 'errored') {
      console.log(`!!!! Build Errored (${val.errorCause}) !!!!`)
      console.log(JSON.stringify(val.error, null, 2))
    }
    if (val.status === 'failed') {
      console.log(`:( :( :( Build Failed (${val.errorCause}) ): ): ):`)
      console.log(JSON.stringify(val.error, null, 2))
    }
  },
  'build:status': () => null,
  'build:done': () => console.log('Finished build'),
}

function consoleBuild(builds, clients, projectId) {
  const sockio = new EventEmitter()
  sockio.send = function (data) {
    data = JSON.parse(data)
    if (showEvent[data.evt]) {
      showEvent[data.evt](data.val)
    } else {
      console.log(`[${data.evt}]`, JSON.stringify(data.val, null, 2))
    }
    if (data.evt === 'build:done') {
      console.log('Done!')
      process.exit()
    }
  }
  clients.newConnection(sockio)
  sockio.emit('message', JSON.stringify({
    evt: 'build:start',
    val: projectId
  }))
}

