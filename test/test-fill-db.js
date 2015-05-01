
const spec = {
  builds: ['project', 'num', 'status'],
  projects: ['name', 'modified'],
}

import Db from './db'
const db = new Db(__dirname + '/.test.db', spec)//, memdown)
import uuid from './uuid'

import config from './loco.config.js'
import config2 from './notablemind.config.js'
import config3 from './itreed-js.config.js'
import config4 from './test.config.js'
const projects = [config, config2, config3, config4]

projects.forEach(proj => {
  proj.id = uuid()
  proj.status = 'inactive'
})
db.batch('projects', 
  projects.map(c => ({type: 'put', key: c.id, value: c})))
  .then(_ => {
  })
