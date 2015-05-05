import expect from 'expect.js'
import memdown from 'memdown'

import uuid from '../lib/uuid'
import Db from '../lib/db'
import Dao from '../lib/dao'

describe('Dao', () => {
  let db, dao
  beforeEach(() => {
    const spec = {
      builds: ['project', 'num', 'status'],
      projects: ['name', 'modified'],
      config: [],
    }
    db = new Db('', spec, memdown)
    dao = new Dao(db)
  })

  it('should clean up zombies', done => {
    dao.putBuild({
      id: 'some',
      status: 'running',
      project: 'other',
    }).then(_ => dao.cleanUpZombies())
    .then(_ => {
      return dao.getBuild('other', 'some')
        .then(build => {
          expect(build.status).to.eql('errored')
          expect(build.errorCause).to.equal('zombie')
        })
    })
    .then(() => done(), done)
  })

  it('.updateBuilds()', done => {
    dao.putBuild({
      id: 'some',
      project: 'other',
      status: 'running',
    }).then(() => dao.updateBuilds([{
      id: 'some',
      project: 'other',
      status: 'failed',
    }])).then(() => dao.getBuild('other', 'some'))
    .then(build => {
      expect(build.status).to.equal('failed')
    })
    .then(done, done)
  })

  it('.setConfig()', done => {
    const conf = {
      one: 2,
      three: 3,
    }
    dao.setConfig(conf).then(data => {
      expect(data).to.eql(conf)
      return dao.getConfig()
    }).then(data => {
      expect(data).to.eql(conf)
    }).then(done, done)
  })

  it('.addProject bad', done => {
    dao.addProject({id: 'something'})
    .then(() => done(new Error('should have thrown')), err => {
      expect(err.message).to.match(/Invalid/)
      done()
    })
  })

  it('.getProject missing', done => {
    dao.getProject(uuid())
    .then(() => done(new Error('should have thrown')),
         err => {
      expect(err.message).to.match(/not found/)
      done()
    })
  })

  it(',getProject by name missing', done => {
    dao.getProject('some name')
    .then(() => done(new Error('should have thrown')),
         err => {
      expect(err.message).to.match(/not found/)
      done()
    })
  })

  it('.updateProject', done => {
    const proj = require('./fixtures/local.config.js')
    dao.addProject(proj).then(data => {
      proj.id = data.id
      return dao.updateProject(proj.id, {latestBuild: 'awesome'})
    }).then(() => dao.getProject(proj.id))
    .then(project => {
      expect(project.latestBuild).to.equal('awesome')
    })
    .then(done, done)
  })

  describe('with a project and a build', () => {
    let pid, bid
    beforeEach(done => {
      const proj = require('./fixtures/local.config.js')
      dao.addProject(proj).then(data => {
        pid = data.id
        bid = uuid()
        return dao.putBuild({
          id: bid,
          project: proj.id,
          num: 10,
          status: 'running',
          something: 'awesome',
        }).then(() => dao.updateProject(proj.id, {latestBuild: bid}))
      }).then(() => done(), done)
    })

    it('.updateProject bad', done => {
      dao.updateProject(pid, {name: 12})
      .then(() => done(new Error('supposed to throw invalid')),
           err => {
        expect(err.message).to.match(/invalid/i)
        done()
      }).catch(done)
    })

    it('.getProjectsWithBuilds', done => {
      const proj = require('./fixtures/local.config.js')
      dao.getProjectsWithBuilds()
        .then(results => {
          try {
            expect(results[pid]).to.be.ok()
            expect(results[pid].latestBuild.something).to.equal('awesome')
            expect(results[pid].latestBuild.id).to.equal(bid)
          } catch (err) {
            console.dir(results)
            return done(err)
          }
          done()
        })
    })

    it('.getNextBuildNumber', done => {
      dao.getNextBuildNumber(pid).then(num => {
        expect(num).to.equal(11)
        done()
      }, done)
    })

    it('.getBuild (by num)', done => {
      dao.getBuild(pid, 10).then(build => {
        expect(build.id).to.equal(bid)
        done()
      }, done)
    })

    it('.getBuild (by num) missing', done => {
      dao.getBuild(pid, 4).then(build => {
        done(new Error('should have thrown'))
      }, err => {
        expect(err.message).to.match(/not found/)
        done()
      })
    })

    it('.deleteBuild', done => {
      dao.deleteBuild(bid).then(() => dao.getBuilds(pid))
      .then(builds => {
        expect(builds).to.eql([])
        done()
      }, done)
    })

    it('.deleteProject', done => {
      dao.deleteProject(pid).then(() => dao.getProjects())
      .then(projects => {
        expect(projects).to.eql([])
        done()
      }, done)
    })
    // TODO remove builds when deleting a project

    it(',getProjectMap', done => {
      dao.getProjectMap().then(pmap => {
        expect(pmap[pid]).to.be.ok()
        expect(pmap[pid].id).to.equal(pid)
      }).then(done, done)
    })

  })

})

