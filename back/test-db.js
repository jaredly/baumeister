
import expect from 'expect.js'

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

describe('db', () => {
  let db
  beforeEach(done => {
    db = new Db(null, spec, memdown)
    done()
  })

  it('should do things', done => {
    db.put('builds', 'someid', {project: 'man'})
      .then(_ => done())
      .catch(err => done(err))
  })

  describe('with some data', () => {
    beforeEach(done => {
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
      ])).then(_ => done())
         .catch(done)
    })

    it('should have values', done => {
      db.all('builds')
        .then(docs => {
          expect(docs.length).to.eql(6)
          // console.log(docs)
          done()
        })
        .catch(done)
    })

    it('should query well', done => {
      db.find('builds', {project: 'one'})
        .then(docs => {
          expect(docs.length).to.eql(4)
          done()
        })
        .catch(done)
    })
  })
})

