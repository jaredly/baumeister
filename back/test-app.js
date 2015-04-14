
import makeViews from './views'

import memdown from 'memdown'

import Manager from './manager'
import app from './app'
import Db from './db'

const spec = {
  builds: ['project', 'num', 'status'],
  projects: ['name', 'modified'],
}

const db = new Db(__dirname + '/.test.db', spec)//, memdown)

import uuid from './uuid'

const manager = new Manager(db, __dirname + '/../.builds')

manager.init().then(_ => {
  const views = makeViews(manager)

  app(3005, views, manager).run(server => {
    console.log('ready')
  })
})

