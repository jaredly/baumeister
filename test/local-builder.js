
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

import LocalBuilder from '../extra/builders/local/local-build'

LocalBuilder.globalConfig = {
  basePath: '/tmp/localBuilder'
}

const fixture = {
  id: '1111_2222',
  name: 'loco',
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

const PLUGINS = {
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
}

describe('local-builder', () => {
  it('should test the thing', function (done) {
    this.timeout(20000)
    const hit = []
    const io = new Replayable()

    io.on('section', sec => hit.push(`<${sec}>`))
    io.pipe({
      emit(evt, val) {
        // console.log(`[${evt}]`, val)
      }
    })

    setup({
      silentConsole: true,
      logDest: __dirname + '/test.log',
      database: {
        inMemory: true,
      }
    }).then(({clients, builds, dao}) => {
      builds.addBuilders({
        docker: LocalBuilder,
      })
      builds.setDefaultBuilder('docker')
      builds.addPlugins(PLUGINS)

      dao.putProject(fixture)
      .then(() => {
        builds.startBuild(fixture.name, io)
          .then(({project, build}) => {
            if (build.error) {
              console.log(build.error)
              console.log(build.error.stack)
            }
            expect(project.latestBuild).to.equal(build.id)
            expect(build.status).to.eql('succeeded')
            expect(hit).to.eql([
              '<init>',
              '<getproject>',
              '<test>',
            ])
            expect(build.error).to.not.be.ok()
            expect(Object.keys(build.events.streams).length).to.equal(2)
            done()
          }, done)
          .catch(done)
      })
    }, done)
  })
})

