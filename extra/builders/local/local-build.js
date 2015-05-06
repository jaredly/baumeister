
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

    const projectDir = path.join(this.config.basePath, 'projects',
                                this.project.id.replace(/:/, '_'))
    this.ctx = {
      runnerConfig: {
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME,
          LANG: process.env.LANG,
          LANGUAGE: process.env.LANGUAGE,
        },
      },
      cacheDir: path.join(projectDir, 'cache'),
      projectDir: path.join(projectDir, 'builds',
                            this.id.replace(/:/, '_')),
    }
  }

  init() {
    if (!this.config || !this.config.basePath) {
      throw new ConfigError('No basepath specified', 'LocalBuilder')
    }
    if (!fs.existsSync(this.config.basePath)) {
      mkdirp.sync(this.config.basePath)
      // throw new ConfigError(`Basepath ${this.config.basePath} does not exist`, 'LocalBuilder')
    }

    return prom(done => fs.exists(this.config.basePath, exists => {
      if (exists) return done()
      mkdirp(this.config.basePath, done)
    }))
    .then(() => prom(done => {
      mkdirp(this.ctx.cacheDir, done)
    }))
    .then(() => prom(done => {
      mkdirp(this.ctx.projectDir, done)
    }))
  }

  shell(runConfig) {
    runConfig = runConfig || {}
    const io = this.io
    const builder = this
    return {
      init() {
        // nothing ventured, nothing gained
        return Promise.resolve()
      },
      run(cmd, options) {
        if (!cmd) {
          throw new Error(`No command given`)
        }
        options = options || {}
        let cwd = runConfig.cwd || builder.ctx.projectDir
        if (cwd[0] !== '/') {
          cwd = builder.ctx.projectDir + cwd
        }

        return runPyTTY(cmd, {
          cwd,
          env: assign(builder.ctx.runnerConfig.env, options.env),
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
      cacheDir: this.ctx.cacheDir,
      projectDir: this.ctx.projectDir,
    }
  }
}

