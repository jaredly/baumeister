
import Promise from 'bluebird'
import mkdirp from 'mkdirp'
import path from 'path'
import fs from 'fs'

import {ConfigError, InterruptError} from '../../../lib/errors'
import BaseBuild from '../../../lib/base-build'
import prom from '../../../lib/prom'
import runPyTTY from './run-pytty'
import assign from 'object-assign'

export default class LocalBuilder extends BaseBuild {
  static type = 'local'

  constructor(io, project, id, config) {
    super(io, project, id, config)

    this.runnerConfig = {
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        LANG: process.env.LANG,
        LANGUAGE: process.env.LANGUAGE,
      },
    }
  }

  init() {
    if (!this.config || !this.config.basePath) {
      throw new ConfigError('No basepath specified', 'LocalBuilder')
    }
    if (!fs.existsSync(this.config.basePath)) {
      throw new ConfigError(`Basepath ${this.config.basePath} does not exist`, 'LocalBuilder')
    }
    const projectDir = path.join(this.config.basePath, 'projects',
                                this.project.id.replace(/:/, '_'))
    return prom(done => fs.exists(this.config.basePath, exists => {
      if (exists) return done()
      mkdirp(this.config.basePath, done)
    }))
    .then(() => prom(done => {
      this.cacheDir = path.join(projectDir, 'cache')
      mkdirp(this.cacheDir, done)
    }))
    .then(() => prom(done => {
      this.projectDir = path.join(projectDir, 'builds',
                                  this.id.replace(/:/, '_'))
      mkdirp(this.projectDir, done)
    }))
  }

  shell(runConfig) {
    const io = this.io
    const builder = this
    return {
      init() {
        // nothing ventured, nothing gained
        return Promise.resolve()
      },
      run(cmd, options) {
        options = options || {}
        let cwd = options.cwd || builder.projectDir
        if (cwd[0] !== '/') {
          cwd = builder.projectDir + cwd
        }

        return runPyTTY(cmd, {
          cwd,
          env: assign(builder.runnerConfig.env, options.env),
        }, {
          silent: options.silent,
          badExitOK: options.badExitOK,
          cleanCmd: options.cleanCmd,
          plugin: runConfig.plugin,
        }, io)
      },
      stop() {
        return Promise.resolve()
      },
      cacheDir: this.cacheDir,
      projectDir: this.projectDir,
    }
  }
}

