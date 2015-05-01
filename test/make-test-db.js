
import Manager from './manager'

import config from './loco.config.js'
import memdown from 'memdown'
import uuid from './uuid'
import Db from './db'

export default function makeTestDb() {
  const db = new Db(null, spec, memdown)

  const id = uuid()

  return db.put('projects', id, config)
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


