
import memdown from 'memdown'
import Db from './db'

const spec = {
  builds: ['project', 'num'],
  projects: [],
}

function uuid() {
  var at = parseInt(Math.random() * 1000)
  return Math.random().toString(35).slice(at, at + 32)
}

function rputs(vals) {
  return vals.map(val => {
    val.id = uuid()
    return {type: 'put', key: val.id, value: val}
  })
}

const db = new Db(null, spec, memdown)

db.batch('builds', rputs([
  {project: 'one',
    num: 0,
    start: new Date(),
    status: 'success'},
  {project: 'one',
    num: 1,
    start: new Date(),
    status: 'success'},
  {project: 'one',
    num : 2,
    start: new Date(),
    status: 'failure'},
  {project: 'one',
    num: 3,
    start: new Date(),
    status: 'success'},
  {project: 'two',
    num: 1,
    start: new Date(),
    status: 'failure'},
  {project: 'two',
    num: 3,
    start: new Date(),
    status: 'success'},
])).then(_ => console.log('ready'))
    .catch(err => console.log('err', err))

export default db

