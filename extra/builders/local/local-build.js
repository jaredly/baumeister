
import path from 'path'

import BaseBuild from '../../../lib/base-build'
import runPyTTY from './run-pytty'

export default class LocalBuild extends BaseBuild {
  static type = 'local'

  constructor(io, project, id, config) {
    super(io, project, id, config)

    if (!config.basePath) {
      throw new ConfigError('No basepath specified')
    }
    if (!fs.existsSync(config.basePath)) {
      throw new ConfigError('Basepath does not exist')
    }
  }

  init() {
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
    return {
      init() {
        // nothing ventured, nothing gained
        return Promise.resolve()
      },
      run(cmd, options) {
        let cwd = options.cwd || this.projectDir
        if (cwd[0] !== '/') {
          cwd = this.projectDir + cwd
        }

        return runPyTTY(cmd, {
          cwd,
          env: this.runnerConfig.env.concat(options.env || []),
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

