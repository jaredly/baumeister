
import expect from 'expect.js'

import Runner from '../lib/runner'
import Replayable from '../lib/replayable'
import locoFixture from './fixtures/loco.config.js'
import {ConfigError, InterruptError} from '../lib/errors'

describe('runner', () => {
  it('minimal testing -> run through the stages', done => {
    const PROJID = '1111_projid'
    const runner = new Runner(new Replayable(), locoFixture, PROJID)
    const hit = []
    runner.use('getproject', (something) => {
      hit.push('plugin:getproject')
    })
    const builder = {
      init() {
        hit.push('init')
      },
      postdeploy() {
        hit.push('postdeploy')
      },
    }
    runner.run(builder)
      .then(res => {
        expect(hit).to.eql(['init', 'plugin:getproject', 'postdeploy'])
        done()
      })
      .catch(done)
  })

  it('should be interruptable', done => {
    const PROJID = '1111_projid'
    const io = new Replayable()
    /* for debug
    io.pipe({
      emit(evt, val) {
        if (val) {
          console.log(`[${evt}]: `, val ? JSON.stringify(val, null, 2) : undefined)
        } else {
          console.log(`[${evt}]`)
        }
      }
    })
    */

    const runner = new Runner(io, locoFixture, PROJID)
    const hit = []
    runner.use('getproject', (something) => {
      return new Promise((resolve, reject) => {
        hit.push('plugin:getproject')
        setTimeout(() => resolve(), 10)
      })
    })
    const builder = {
      init() {
        hit.push('init')
      },
      postdeploy() {
        hit.push('postdeploy')
      },
    }
    setTimeout(() => runner.stop(() => hit.push('stopped')), 5)
    runner.run(builder)
      .then(res => {
        console.log(hit)
        done(new Error('Not interrupted'))
      })
      .catch(err => {
        if (err instanceof InterruptError) {
          expect(hit).to.eql(['init', 'plugin:getproject'])
          done()
        } else {
          done(err)
        }
      })
  })
})

