
import memdown from 'memdown'
import {EventEmitter} from 'events'

import Db from './db'
import Dao from './dao'
import PluginManager from './plugin-manager'
import BuildManager from './build-manager'
import ClientManager from './client-manager'
import makeLogger from './logger'

export default function setup(config) {
  const spec = {
    builds: ['project', 'num', 'status'],
    projects: ['name', 'modified'],
    pluginCache: ['user'],
    config: [],
    // TODO users: [],
  }

  let io = new EventEmitter()

  let db
  if (config.database.inMemory) {
    db = new Db('', spec, memdown)
  } else {
    db = new Db(config.database.path, spec)//, memdown)
  }
  const logger = makeLogger(config.logDest || __dirname + '/../logs/all-logs.log', config.silentConsole)
  const dao = new Dao(io, db, logger)

  const plugins = new PluginManager(io, dao, logger)
  const builds = new BuildManager(io, dao, logger, plugins)
  const clients = new ClientManager(io, dao, builds, logger)

  logger.info('setup db, clients, builds')
  return builds.init()
    .then(_ => clients.init())
    .then(_ => ({clients, builds, dao, plugins}))
}

