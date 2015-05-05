#!/usr/bin/env babel-node

import Promise from 'bluebird'
import assign from 'object-assign'
import {EventEmitter} from 'events'
import {argv} from 'yargs'
import repl from 'repl'
import path from 'path'
import fs from 'fs'

import uuid from './lib/uuid'
import setupManager from './lib'
import setupApp from './app/back/setup'
import makeViews from './app/back/views'
import loadPlugins from './lib/load-plugins'

class UsageError extends Error { }

const showEvent = {
  'build:new': val => console.log(`# Build created ${val.id}`),
  'build:update': val => {
    if (val.status === 'running') return
    if (val.status === 'succeeded') {
      return console.log(`#### Build Passed! ####`)
    }
    if (val.status === 'errored') {
      console.log()
      console.log(`!!!! Build Errored (${val.errorCause}) !!!!`)
      console.log()
      if (val.errorCause === 'server') {
        console.log(val.error.message)
        console.log(val.error.stack)
      } else if (val.errorCause === 'shell-exit') {
        console.log(`$ ${val.error.cmd} (exit code ${val.error.exitCode})`)
      } else {
        console.log(JSON.stringify(val.error, null, 2))
      }
    }
    if (val.status === 'failed') {
      console.log()
      console.log(`:( :( :( Build Failed (${val.errorCause}) ): ): ):`)
      console.log()
      if (val.errorCause === 'shell-exit') {
        console.log(`$ ${val.error.cmd} (exit code ${val.error.exitCode})`)
      } else {
        console.log(JSON.stringify(val.error, null, 2))
      }
      console.log()
    }
  },
  'build:status': () => null,
  'build:done': () => console.log('Finished build'),
  'build:event': val => {
    const type = val.event.evt
    val = val.event.val
    if (type === 'stream-start') {
      console.log()
      console.log(`>> $ ${val.cmd || val.title}`)
      console.log()
    } else if (type === 'stream') {
      process.stdout.write(val.value)
    } else if (type === 'stream-end') {
      console.log()
      console.log('<<')
      console.log()
    } else if (type === 'section') {
      console.log()
      console.log(`[[[[    ${val}    ]]]]`)
      console.log()
    } else if (type === 'info') {
      console.log('{info}', val)
    } else {
      console.log(`[${type}]`, val)
    }
  }
}

function loadDefaultProjects(pos, argv, dao) {
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
  return dao.getProjects().then(currents => {
    if (currents.length) {
      if (!(argv.f || argv.force)) {
        throw new UsageError('DB not empty! (-f to replace db)')
      }
      console.log('Deleting current projects')
      return Promise.all(currents.map(proj =>
                                      dao.deleteProject(proj.id)))
    }
  }).then(() => {
    return Promise.all(projects.map(proj => dao.addProject(proj)))
  })
}

function setup(config) {
  return setupManager(config)
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
}

const commands = {
  serve(pos, argv) {
    return setup(config)
      .then(({app, builds, clients, dao}) => app.run(server => {
        console.log('ready')
      }))
  },
  repl(pos, argv) {
    return setup(config)
      .then(({builds, clients, dao}) => {
        global.builds = builds
        global.clients = clients
        global.dao = dao
        console.log('### Jaeger repl! ###')
        console.log('--- available variables: ---')
        console.log('- builds: BuildManager')
        console.log('- clients: ClientManager')
        console.log('- dao: Dao')
        repl.start({useGlobal: true})
      })
  },
  initdb(pos, argv) {
    return setup(config)
      .then(({builds, clients, dao}) => {
        return loadDefaultProjects(pos, argv, dao)
      })
  },
  build(pos, argv) {
    return setup(config)
      .then(({builds, clients, dao}) => {
        const project = pos.shift()
        if (!project) throw new UsageError('Project id / file required')
        return Promise.resolve().then(_ => {
          if (!fs.existsSync(path.resolve(project))) {
            return project
          }
          let data
          try {
            data = require(path.resolve(project))
          } catch (err) {
            throw new UsageError(`Failed to require file: ${project}`)
          }
          if (!data.id) data.id = uuid()
          return dao.putProject(data)
            .then(_ => data.name)
        }).then(projectId => {
          const sockio = new EventEmitter()
          sockio.send = function (data) {
            data = JSON.parse(data)
            if (showEvent[data.evt]) {
              showEvent[data.evt](data.val)
            } else {
              console.log(`[${data.evt}]`, JSON.stringify(data.val, null, 2))
            }
            if (data.evt === 'build:new') {
              sockio.emit('message', JSON.stringify({
                evt: 'build:view',
                val: data.val.id,
              }))
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
      })
    })
  },
}

const conffile = argv.config || argv.c || './config'
const config = require(path.resolve(conffile))

const pos = argv._.slice()
const cmd = pos.shift() || 'serve'

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

Promise.resolve()
.then(_ => {
  if (!commands[cmd]) {
    throw new UsageError(`Unknown command: ${cmd}`)
  }
  return commands[cmd](pos, argv)
})
.catch(error => {
  if (error instanceof UsageError) {
    console.log()
    console.log('! Usage error:', error.message)
    console.log()
    console.log('  Usage: cli.js serve / other things')
    console.log()
  } else {
    console.log()
    console.log('Unknown error!')
    console.log(error.message)
    console.log(error.stack)
    console.log()
  }
})

