
import expect from 'expect.js'
import memdown from 'memdown'

import Promise from 'bluebird'
import Db from '../lib/db'
import Dao from '../lib/dao'
import BuildManager from '../lib/build-manager'
import Replayable from '../lib/replayable'
import locoFixture from './fixtures/loco.config.js'
import {ConfigError, InterruptError} from '../lib/errors'
import setup from '../lib'
import BaseBuild from '../lib/base-build'

function getDummyBuilder(hit) {
  return class DummyBuilder extends BaseBuild {
    init() {
      hit.push('init')
    }

    shell(options) {
      let log = []
      hit.push(log)
      return {
        dataDir: '/data',
        cacheDir: '/cache',
        init() {
          log.push('init')
          return Promise.resolve()
        },
        run(cmd) {
          log.push(cmd)
        },
        stop() {
          log.push('stopped')
          return true
        }
      }
    }

    postdeploy() {
      hit.push('postdeploy')
    }
  }
}

describe('things', () => {
  it('should setup ok', done => {
    setup({
      database: {
        inMemory: true,
      }
    }).then(({clients, builds, dao}) => {
      done()
    }, done)
  })

  it('with just a dummy builder + dummy getproject plugin', done => {
    const hit = []
    const io = new Replayable()

    const DummyBuilder = getDummyBuilder(hit)

    locoFixture.plugins = {
      getprojecter: {}
    }

    setup({
      database: {
        inMemory: true,
      }
    }).then(({clients, builds, dao}) => {
      builds.addBuilders({
        dummy: DummyBuilder,
      })
      builds.setDefaultBuilder('dummy')

      builds.addPlugins({
        getprojecter: {
          onBuild(project, data, runner) {
            runner.use('getproject', () => {
              hit.push('getproject')
            })
          }
        }
      })

      locoFixture.id = '1111_proj'
      dao.putProject(locoFixture)
      .then(() => dao.getProjects())
      .then(() => {
        builds.startBuild(locoFixture.name, io)
          .then(({project, build}) => {
            expect(project.latestBuild).to.equal(build.id)
            expect(hit).to.eql(['init', 'getproject', 'postdeploy'])
            expect(build.status).to.eql('succeeded')
            done()
          }, done)
          .catch(done)
      })
    }, done)
  })

  it('trying a faked-out more of a setup with some plugins', done => {
    const hit = []
    const io = new Replayable()

    io.on('section', sec => hit.push(`<${sec}>`))

    const DummyBuilder = getDummyBuilder(hit)

    locoFixture.plugins = {
      'shell-provider': {
        cache: true,
        get: 'echo "hello" > world.txt',
        update: 'echo "more" > world.txt',
      },
      'shell-tester': {
        command: 'grep hello world.txt',
      },
    },

    setup({
      database: {
        inMemory: true,
      }
    }).then(({clients, builds, dao}) => {
      builds.addBuilders({
        dummy: DummyBuilder,
      })
      builds.setDefaultBuilder('dummy')

      builds.addPlugins({
        'shell-provider': {
          onBuild(project, data, runner, config) {
            runner.use('getproject', builder => {
              return builder.run(config.get)
            })
          },
        },
        'shell-tester': {
          onBuild(project, data, runner, config) {
            runner.use('test', builder => {
              return builder.run(config.command)
            })
          }
        },
      })

      locoFixture.id = '1111_proj'
      dao.putProject(locoFixture)
      .then(() => dao.getProjects())
      .then(() => {
        builds.startBuild(locoFixture.name, io)
          .then(({project, build}) => {
            console.log(build)
            expect(project.latestBuild).to.equal(build.id)
            expect(build.status).to.eql('succeeded')
            expect(hit).to.eql([
              '<init>',
              'init',
              '<getproject>',
              ['init', locoFixture.plugins['shell-provider'].get, 'stopped'],
              '<test>',
              ['init', locoFixture.plugins['shell-tester'].command, 'stopped'],
              '<postdeploy>',
              'postdeploy'])
            done()
          }, done)
          .catch(done)
      })
    }, done)
  })
})

