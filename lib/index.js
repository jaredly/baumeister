
import memdown from 'memdown'

import Db from './db'
import Dao from './dao'
import BuildManager from './build-manager'
import ClientManager from './client-manager'
import makeLogger from './logger'

export default function setup(config) {
  const spec = {
    builds: ['project', 'num', 'status'],
    projects: ['name', 'modified'],
    config: [],
    // TODO users: [],
  }

  let db
  if (config.database.inMemory) {
    db = new Db('', spec, memdown)
  } else {
    db = new Db(config.database.path, spec)//, memdown)
  }
  const logger = makeLogger(config.logDest || __dirname + '/../logs/all-logs.log', config.silentConsole)
  const dao = new Dao(db, logger)

  const builds = new BuildManager(dao, logger)
  const clients = new ClientManager(dao, builds, logger)

  logger.info('setup db, clients, builds')
  return builds.init()
    .then(_ => clients.init())
    .then(_ => ({clients, builds, dao}))
}

