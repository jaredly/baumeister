
import memdown from 'memdown'

import Manager from './manager'
import Db from './db'

export default function setup(config, done) {
  const spec = {
    builds: ['project', 'num', 'status'],
    projects: ['name', 'modified'],
    config: [],
  }

  const db = new Db(__dirname + '/.test.db', spec)//, memdown)

  const manager = new Manager(db)

  console.log('setup db')
  manager.init().then(_ => {
    done(manager)
  })
}

