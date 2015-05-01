
import Manager from './manager'

import config from './notablemind.config.js'
import memdown from 'memdown'
import Db from './db'
import uuid from './uuid'

const spec = {
  builds: ['project', 'num', 'status'],
  projects: ['name', 'modified'],
}

const db = new Db(null, spec, memdown)

const id = '1429080316006_wu259y0rf1liqs5lysaa' // uuid()
config.id = id

db.put('projects', id, config)
  .then(_ => {

    const m = new Manager(db, __dirname + '/../.builds')
    const fn = (evt, val) => {
      if (evt === 'build:event') {
        if (val.event.evt === 'stream') {
          process.stdout.write(val.event.val.value)
        } else if (val.event.evt === 'stream-start') {
          console.log('[start]', val.event.val.cmd || val.event.val.title)
        }
      } else {
        console.log('[sub]', evt, val)
      }
    }

    m.startBuild('notablemind')
      .then(id => {
        m.addSub(id, {send: fn})
      })
      .catch(err => {
        console.log('failed?')
        setTimeout(_ => {
          throw err
        }, 1)
      })
  })

