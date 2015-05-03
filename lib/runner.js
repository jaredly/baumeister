
import path from 'path'
import fs from 'fs'

import prom from './prom'
import {ConfigError, InterruptError} from './errors'

const STAGES = [
  'init',
  'getproject',
  'environment',
  'pretest',
  'test',
  'posttest',
  'predeploy',
  'deploy',
  'postdeploy',
]

export default class Runner {
  constructor(io, project, id) {
    this.id = id
    this.project = project
    this.state = {}
    this.stopper = null
    this.stopped = false
    this.stages = {}
    STAGES.forEach(name => this.stages[name] = [])
    this.interrupted = false
    this.onInterrupt = null
    this.io = io
  }

  use(stage, fn, prepend) {
    if (! this.stages[stage]) {
      throw new Error(`Unknown stage ${stage}`)
    }
    if (prepend) {
      this.stages[stage].unshift(fn)
    } else {
      this.stages[stage].push(fn)
    }
  }

  run(builder) {
    this.builder = builder
    this.stage = STAGES[0]
    this.ctx = {}
    return this._runStage()
  }

  stop() {
    return prom(done => {
      this.interrupted = true
      this.onInterrupt = () => {
        this.onInterrupt = null
        done()
      }
      this.io.emit('interrupt', done)
    })
  }

  _runStage() {
    if (this.interrupted) {
      this.onInterrupt()
      throw new InterruptError()
    }
    return this._stagePromises(this.stage)
      .then(() => this._runNextStage())
  }

  _runNextStage() {
    const ix = STAGES.indexOf(this.stage)
    if (ix >= STAGES.length - 1) {
      return null
      // DONE! Should I return something different?
    }
    this.stage = STAGES[ix + 1]
    return this._runStage()
  }

  _stagePromises(stage) {
    let p = Promise.resolve()
    if (!this.stages[this.stage].length && this.stage === 'getproject') {
      throw new ConfigError('No plugin provided to get the project')
      // TODO should this just be a warning?
    }
    this.stages[this.stage].forEach(fn => {
      p = p.then(() => {
        if (this.interrupted) {
          this.onInterrupt()
          throw new InterruptError()
        }
        return fn()
      })
    })
    if (this.builder[this.stage]) {
      p = p.then(() => this.builder[this.stage]())
    }
    return p
  }

  /*
  run(done) {
    let finish = (err, exitCode) => {
      if (err instanceof ConfigError) {
        this.io.emit('config-error', {message: err.message, stack: err.stack})
      } else if (err) {
        this.io.emit('server-error', {message: err.message, stack: err.stack})
      }
      done(err, exitCode)
    }
    this.io.emit('section', 'get-project')
    this.ensureDataContainers(err => {
      if (err) return finish(err)
      this.getProject((err, exitCode) => {
        if (err || exitCode) return finish(err, exitCode)
        this.prepareImage((err, exitCode, name) => {
          if (err || exitCode) return finish(err, exitCode)
          this.test(name, finish)
        })
      })
    })
  }
  */
}

function ensureDir(dir, done) {
  fs.exists(dir, exists => {
    if (exists) return done(null, true)
    fs.mkdir(dir, err => {
      if (err) return done(new Error(`Could not create path ${dir}`))
      done(null, false)
    })
  })
}


