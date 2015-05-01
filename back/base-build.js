
import path from 'path'
import fs from 'fs'

import assign from 'object-assign'
import providers from './providers'
import Replayable from './replayable'
import ConfigError from './config-error'

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

export default class BaseBuild extends Replayable {
  constructor(project, id, config) {
    super()
    this.id = id
    this.project = project
    this.basePath = basePath
    this.state = {}
    this.stopper = null
    this.stopped = false
    this.stages = {}
    STAGES.forEach(name => this.stages[name] = [])
    this.requiredStages = ['getproject']

    this.onInterrupt = null
    this.interrupter = new Promise((res, rej) => {
      this.onInterrupt = () => {
        rej(new InterruptError())
      }
    })
  }

  init() {
    // to be overridden
  }

  runner(options) {
    throw new Error('override')
  }

  clearCache() {
    throw new Error('Override')
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

  runCached(runConfig, config) {
    const sh = this.runner(runConfig)
    return runCached(sh, config)
  }

  stop() {
    this.onInterrupt()
    return prom(done => this.emit('interrupt', done))
  }

  run() {
    this.stage = STAGES[0]
    this.ctx = {}
    return this.runStage()
  }

  runStage() {
    let p = Promise.resolve()
    this.stages[this.stage].forEach(fn => {
      p = p.then(() => Promise.race([
        this.interrupter,
        fn()
      ]))
    })
    if (this.stage === 'init') {
      p = p.then(() => this.init())
    }
    return p.then(() => this.runNextStage())
  }

  runNextStage() {
    const ix = STAGES.indexOf(this.stage)
    if (ix >= STAGES.length - 1) {
      return null
      // DONE! Should I return something different?
    }
    this.stage = STAGES[ix + 1]
    return this.runStage()
  }

  run(done) {
    let finish = (err, exitCode) => {
      if (err instanceof ConfigError) {
        this.emit('config-error', {message: err.message, stack: err.stack})
      } else if (err) {
        this.emit('server-error', {message: err.message, stack: err.stack})
      }
      done(err, exitCode)
    }
    this.emit('section', 'get-project')
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


function runCached(sh, config) {
  const projectCache = `${sh.cacheDir}/${config.cachePath}`
  const projectPath = `${sh.projectDir}/${config.projectPath}`
  let cached = false
  return sh.init()
    .then(() => sh.run(`stat ${projectCache}`, {
      badExitOK: true,
      silent: true,
    }))
    .then(result => {
      if (result.code !== 0) {
        return sh.run(config.get)
          .then(_ => sh.run(`cp -RT ${projectPath} ${projectCache}`))
      }
      cached = true
      this.emit('info', 'Using cache')
      return sh.run(`rsync -azrh ${projectCache} ${projectPath}`)
        .then(_ => sh.run(config.update))
        .then(_ => sh.run(`rsync -azrh --delete-after ${projectPath} ${projectCache}`))
    })
    .then(_ => sh.stop())
}

