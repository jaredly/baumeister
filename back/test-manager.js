
import Manager from './manager'

import config from './loco.config.js'
import memdown from 'memdown'
import Db from './db'
import uuid from './uuid'

const spec = {
  builds: ['project', 'num', 'status'],
  projects: ['name', 'modified'],
}

const db = new Db(null, spec, memdown)

const id = uuid()

db.put('projects', id, config)
  .then(_ => {

    const m = new Manager(db, __dirname + '/../.builds')
    const fn = (id, evt, val) => console.log('[sub]', id, evt, val)

    m.startBuild('loco')
      .then(id => {
        m.addSub(id, fn)
      })
      .catch(err => {
        console.log('failed?')
        setTimeout(_ => {
          throw err
        }, 1)
      })
  })

