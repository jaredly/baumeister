
import memdown from 'memdown'

import Db from './db'
import Dao from './dao'
import BuildManager from './build-manager'
import ClientManager from './client-manager'

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
  const dao = new Dao(db)

  const builds = new BuildManager(dao)
  const clients = new ClientManager(dao, builds)

  console.log('setup db, clients, builds')
  return builds.init()
    .then(_ => clients.init())
    .then(_ => ({clients, builds, dao}))
}
