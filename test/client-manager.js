
import expect from 'expect.js'
import memdown from 'memdown'

import {EventEmitter} from 'events'
import Promise from 'bluebird'
import Db from '../lib/db'
import Dao from '../lib/dao'
import BuildManager from '../lib/build-manager'
import Replayable from '../lib/replayable'
import locoFixture from './fixtures/loco.config.js'
import {ConfigError, InterruptError} from '../lib/errors'
import setup from '../lib'
import BaseBuild from '../lib/base-build'
import makeLogger from '../lib/logger'

const logger = makeLogger(__dirname + '/test.log', true)

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

describe('ClientBuilder', () => {
  it('with just a dummy builder + dummy getproject plugin', done => {
    const hit = []
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
    }).then(({clients, plugins, dao}) => {
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
      .then(() => {
        const sockio = new EventEmitter()
        sockio.send = function (data) {
          data = JSON.parse(data)
          if (data.evt === 'build:done') {
            expect(hit).to.eql(['init', 'getproject', 'postdeploy'])
            done()
          }
        }
        clients.newConnection(sockio)
        sockio.emit('message', JSON.stringify({
          evt: 'build:start',
          val: locoFixture.name
        }))
      })
    }, done)
  })

})

