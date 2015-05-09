
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

describe('BuildManager', () => {
  it('should setup ok', done => {
    setup({
      silentConsole: true,
      logDest: __dirname + '/test.log',
      database: {
        inMemory: true,
      }
    }).then(({clients, builds, dao}) => {
      done()
    }, done)
  })

  it('should fail with unknown plugin', done => {
    const hit = []
    const io = new Replayable()
    const DummyBuilder = getDummyBuilder(hit)

    const locoFixture = {
      name: 'heiii',
      plugins: {
        unknownplugin: {}
      },
      modified: new Date(),
    }

    setup({
      silentConsole: true,
      logDest: __dirname + '/test.log',
      database: {inMemory: true}}).then(({clients, builds, plugins, dao}) => {
      plugins.addBuilders({
        dummy: DummyBuilder,
      })
      plugins.setDefaultBuilder('dummy')

      locoFixture.id = '1111_proj'
      dao.putProject(locoFixture)
      .then(() => dao.getProjects())
      .then(() => builds.startBuild(locoFixture.name, null, io))
      .then(({project, build}) => {
        console.dir(build)
        expect(build.status).to.equal('errored')
        expect(build.errorCause).to.equal('configuration')
        done()
      }).catch(done)
    }, done)
  })

  it('with just a dummy builder + dummy getproject plugin', done => {
    const hit = []
    const io = new Replayable()

    const DummyBuilder = getDummyBuilder(hit)

    const locoFixture = {
      name: 'heiii',
      plugins: {
        getprojecter: {}
      },
      modified: new Date(),
    }

    setup({
      silentConsole: true,
      logDest: __dirname + '/test.log',
      database: {
        inMemory: true,
      }
    }).then(({clients, builds, plugins, dao}) => {
      plugins.addBuilders({
        dummy: DummyBuilder,
      })
      plugins.setDefaultBuilder('dummy')

      plugins.addPlugins({
        getprojecter: {
          onBuild(project, data, onStep) {
            onStep('getproject', () => {
              hit.push('getproject')
            })
          }
        }
      })

      locoFixture.id = '1111_proj'
      dao.putProject(locoFixture)
      .then(() => dao.getProjects())
      .then(() => {
        builds.startBuild(locoFixture.name, null, io)
          .then(({project, build}) => {
            try {
              expect(project.latestBuild).to.equal(build.id)
              expect(hit).to.eql(['init', 'getproject', 'postdeploy'])
              expect(build.status).to.eql('succeeded')
              done()
            } catch (err) {
              console.dir(project)
              console.log(build)
              done(err)
            }
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

    const locoFixture = {
      name: 'heiii',
      modified: new Date(),
      plugins: {
        'shell-provider': {
          cache: true,
          get: 'echo "hello" > world.txt',
          update: 'echo "more" > world.txt',
        },
        'shell-tester': {
          command: 'grep hello world.txt',
        },
      },
    }

    setup({
      silentConsole: true,
      logDest: __dirname + '/test.log',
      database: {
        inMemory: true,
      }
    }).then(({clients, builds, plugins, dao}) => {
      plugins.addBuilders({
        dummy: DummyBuilder,
      })
      plugins.setDefaultBuilder('dummy')

      plugins.addPlugins({
        'shell-provider': {
          onBuild(project, data, onStep, config) {
            onStep('getproject', builder => {
              return builder.run(config.get)
            })
          },
        },
        'shell-tester': {
          onBuild(project, data, onStep, config) {
            onStep('test', builder => {
              return builder.run(config.command)
            })
          }
        },
      })

      locoFixture.id = '1111_proj'
      dao.putProject(locoFixture)
      .then(() => dao.getProjects())
      .then(() => {
        builds.startBuild(locoFixture.name, null, io)
          .then(({project, build}) => {
            try {
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
            } catch (er) {
              console.log('AAAAAAAAAAAAAAa')
              console.dir(project)
              console.dir(build)
              throw er
            }
            done()
          }, done)
          .catch(done)
      })
    }, done)
  })
})

