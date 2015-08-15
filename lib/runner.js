
import path from 'path'
import fs from 'fs'

import prom from './prom'
import {ShellError, FailError, ConfigError, InterruptError} from './errors'

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
  'cleanup',
]

/**
 * The Runner
 *
 * The runner is solely responsible for running each of the phases. Plugins
 * (and anything else) can call `.use(phase, action)`, and the `action` will be called
 * during that phase. Actions are called in the order they are added (unless they
 * are prepended).
 *
 * If an error occurs, the pipeline will be aborted and no subsequent
 * functions will be called. However, then `cleanup` phase will always be
 * called.
 * If the cleanup phase throws an error, but there was already an error from
 * the previous execution, the cleanup error will be ignored. Otherwise, it
 * will be propagated.
 *
 * If there are no `getproject` actions registered by the time the stage runs,
 * an exception is thrown.
 *
 * If there are no `test` actions registered, an `info` is emitted indicating
 * that (so that people aren't confused thinking "why didn't my tests run?").
 *
 * constructor() {
 *  io: the global eventemitter
 *  project: the project data
 *  id: build id
 */
export default class Runner {
  constructor(io, project, id) {
    this.id = id
    this.project = project
    this.stopper = null
    this.stopped = false
    this.stages = {}
    STAGES.forEach(name => this.stages[name] = [])
    this.interrupted = false
    this.onInterrupt = () => {}
    this.io = io
    this.inCleanup = false
  }

  /**
   * Plugins generally use this (proxied as the `onStep` function) to register
   * actions to be performed during a given phase.
   *
   * The action will be called with (builder, ctx, io). If it returns a
   * Promise, then execution will wait until the promise resolves.
   */
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

  /**
   * Called to kick things off. builder should be an instance of a subclass of
   * BaseBuilder.
   *
   * Returns a promise that will resolve/reject when the build is done or
   * fails.
   */
  run(builder) {
    this.builder = builder
    this.stage = STAGES[0]
    return this._runStage()
      .catch(err => {
        if (this.stage === 'cleanup') throw err
        this.stage = 'cleanup'
        // ignore cleanup errors at this point
        return this._runStage().catch(() => null).then(() => {
          throw err
        })
      })
  }

  /**
   * Interrupt the current running job.
   *
   * Returns a promise that resolves indicating that the build has been
   * successfully interrupted.
   */
  stop() {
    return prom(done => {
      this.interrupted = true
      this.onInterrupt = () => {
        this.onInterrupt = () => {}
        done()
      }
      this.io.emit('interrupt', done)
    })
  }

  // internally used functions

  /**
   * Run the current stage and then tail-call the next stage
   *
   * Returns a promise
   */
  _runStage() {
    if (this.interrupted) {
      this.onInterrupt()
      throw new InterruptError()
    }
    return this._stagePromises(this.stage)
      .then(() => this._runNextStage())
  }

  /**
   * Increment the stage and start the next stage
   */
  _runNextStage() {
    const ix = STAGES.indexOf(this.stage)
    if (ix >= STAGES.length - 1) {
      return null
      // DONE! Should I return something different?
    }
    this.stage = STAGES[ix + 1]
    return this._runStage()
  }

  /**
   * Construct the promise chain for a given stage
   *
   * - actions registered via the `use(stage, action)` calls
   * - if the builder has a function with the same name as the stage, that
   *   function is chained *after* all of the other actions have run
   *
   * After the `test` stage runs, `builder.setTestStatus()` is run with the
   * results - either, passed, failed, or errored
   */
  _stagePromises(stage) {
    let p = Promise.resolve()
    if (!this.stages[this.stage].length && this.stage === 'getproject') {
      throw new ConfigError('No plugin provided to get the project', 'project.plugins')
      // TODO should this just be a warning?
    }
    if (this.stages[this.stage].length || this.builder[this.stage]) {
      this.io.emit('section', this.stage)
    }
    if (!this.stages[this.stage].length && this.stage === 'test') {
      this.io.emit('section', this.stage)
      this.io.emit('info', 'No plugins configured for testing')
    }
    this.stages[this.stage].forEach(fn => {
      p = p.then(() => {
        if (this.interrupted) {
          this.onInterrupt()
          throw new InterruptError()
        }
        return prom(done => {
          const dom = require('domain').create()
          dom.on('error', done)
          dom.run(() => {
            Promise.resolve(fn(this.builder, this.builder.ctx, this.io))
              .then(val => done(null, val), done)
          })
        })
      })
    })
    if (this.builder[this.stage]) {
      p = p.then(() => this.builder[this.stage]())
    }

    // update test status
    if (this.stage === 'test') {
      p = p.then(() => {
        this.builder.setTestStatus('passed')
      }, err => {
        if (err instanceof ShellError || err instanceof FailError) {
          this.builder.setTestStatus('errored')
        } else {
          this.builder.setTestStatus('failed')
        }
        throw err
      })
    }
    return p
  }
}

