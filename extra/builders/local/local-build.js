
import Promise from 'bluebird'
import mkdirp from 'mkdirp'
import path from 'path'
import fs from 'fs'

import {ConfigError, InterruptError} from '../../../lib/errors'
import BaseBuild from '../../../lib/base-build'
import prom from '../../../lib/prom'
import runPyTTY from './run-pytty'

export default class LocalBuilder extends BaseBuild {
  static type = 'local'

  constructor(io, project, id, config) {
    super(io, project, id, config)

    this.runnerConfig = {
      env: [],
    }
  }

  init() {
    if (!this.config || !this.config.basePath) {
      throw new ConfigError('No basepath specified')
    }
    if (!fs.existsSync(this.config.basePath)) {
      throw new ConfigError(`Basepath ${config.basePath} does not exist`)
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

  shell(options) {
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
          env: builder.runnerConfig.env.concat(options.env || []),
        }, {
          silent: options.silent,
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

