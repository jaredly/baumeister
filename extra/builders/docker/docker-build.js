
import Docker from 'dockerode'
import path from 'path'
import fs from 'fs'

import Promise from 'bluebird'
import assign from 'object-assign'
// import buildDocker from './build-docker'
// import getContext from './get-context'
// import runDocker from './run-docker'
import BaseBuild from '../../../lib/base-build'
import prom from '../../../lib/prom'
import Docksh from './docksh'

import {ConfigError, InterruptError, ShellError} from '../../../lib/errors'


export default class DockerBuild extends BaseBuild {
  static type = 'docker'

  constructor(io, project, id, config) {
    super(io, project, id, config)
    this.docker = new Docker() // TODO use config to custom docker connection
    this.ctx = {
      cacheContainer: `dci-${this.project.id}-cache`,
      dataContainer: `dci-${this.id}-data`,
      runnerConfig: {
        volumesFrom: [],
        binds: [],
        env: [],
      },
      cacheDir: '/cache',
      projectDir: '/project',
    }
  }

  init() {
    const promises = []
    // create data container
    if (this.ctx.dataContainer) {
      this.ctx.runnerConfig.volumesFrom.push(this.ctx.dataContainer)
      promises.push(prom(done => {
        this.docker.createContainer({
          name: '/' + this.ctx.dataContainer,
          Image: 'busybox',
          Volumes: {'/project': {}},
        }, (err, res) => {
          if (err) return done(err)
          this.io.emit('info', `Created data container ${this.ctx.dataContainer} (${res.id})`)
          done()
        })
      }))
    }

    // check for / create cache container
    if (this.ctx.cacheContainer) {
      this.ctx.runnerConfig.volumesFrom.push(this.ctx.cacheContainer)
      promises.push(prom(done => {
        ensureContainer(this.docker, this.ctx.cacheContainer, '/cache', (err, id, created) => {
          if (err) return done(err)
          this.io.emit('info', `${created ? 'Created' : 'Using'} cache container ${this.ctx.cacheContainer} (${id})`)
          done()
        })
      }))
    }

    return prom(done => {
      this.docker.version((err, data) => {
        if (err) return done(new ConfigError(`Unable to connect to docker daemon: ${err.message}`))
        done()
      })
    }).then(() => Promise.all(promises))
  }

  shell(config) {
    config = config || {}
    const io = this.io
    const sh = new Docksh(this.docker, {
      volumesFrom: this.ctx.runnerConfig.volumesFrom,
      binds: this.ctx.runnerConfig.binds,
      env: assign(this.ctx.runnerConfig.env, config.env),

      image: config.docker && config.docker.image || 'ubuntu',
      // cwd: config.cwd || '/project',
    })

    return {
      init() {
        return interprom(io, sh.init())
      },
      run(cmd, options) {
        options = options || {}
        if (options.silent) {
          return sh.runSilent(cmd, io)
            .then(result => {
              if (result.code !== 0 && !options.badExitOK) {
                throw new ShellError(cmd, result.code)
              }
              return result
            })
        }
        return sh.run(cmd, io, config.plugin)
          .then(code => {
            if (code !== 0 && !options.badExitOK) {
              throw new ShellError(cmd, code)
            }
            return code
          })
      },
      stop() {
        return config.dontRemove ? sh.stop() : sh.stopAndRemove()
      },
      cacheDir: this.ctx.cacheDir,
      projectDir: this.ctx.projectDir,
    }
  }

  /*
  clearCache() {
    if (!this.ctx.cacheContainer) return
    return prom(done => {
      this.docker.getContainer(this.ctx.cacheContainer)
        .remove({v: 1}, (err, data) => {
          if (err) {
            if (err.statusCode === 404) return done()
            return done(err)
          }
          done()
        })
    })
  }

  clearData() {
    if (!this.ctx.dataContainer) return
    return prom(done => {
      this.docker.getContainer(this.ctx.dataContainer)
        .remove({v: 1}, (err, data) => {
          if (err) {
            if (err.statusCode === 404) return done()
            return done(err)
          }
          done()
        })
    })
  }

  getProject(done) {
    if (this.project.source.path) {
      return fs.exists(this.project.source.path, doesExist => {
        if (!doesExist) {
          return done(new ConfigError(`Local project base ${this.project.source.path} does not exist`))
        }
        if (this.project.source.inPlace) {
          this.io.emit('info', `Local project ${this.project.source.path}`)
          return done()
        }
        console.log('GET FROM', this.project.source.path)
        this.io.emit('info', `Copying local project from ${this.project.source.path}`)
        return runDocker(this.docker, {
          image: 'busybox',
          rmOnSuccess: true,
          binds: [this.project.source.path + ':/localProject:rw'],
          volumesFrom: [this.dataContainer],
          cmd: 'cp -r /localProject/* /project',
        }, this, done)
      })
    }

    const pro = providers[this.project.source.provider]
    if (!pro) {
      const err = new ConfigError(`Unknown provider ${this.project.source.provider}`)
      this.io.emit('error', err.message)
      return done(err)
    }

    const config = {
      volumesFrom: [this.cacheContainer, this.dataContainer],
      source: this.project.source.config
    }

    pro(this.docker, config, this, err => {
      done(err)
    })
  }

  prepareImage(done) {
    this.io.emit('section', 'prepare-image')
    if (this.project.build.prefab) {
      this.io.emit('info', 'Using prefab image: ' + this.project.build.prefab)
      return done(null, null, this.project.build.prefab)
    }
    const imname = 'docker-ci/' + this.project.name + ':test'
    if (!this.project.build.noRebuild) {
      return this.build(imname, (err, exitCode) => {
        done(err, exitCode, imname)
      })
    }
    this.docker.listImages((err, images) => {
      if (err) return done(err)
      const needToBuild = !images.some(
        im => im.RepoTags.indexOf(imname) !== -1)
      if (!needToBuild) {
        this.io.emit('info', `Image ${imname} already built`)
        return done(err, null, imname)
      }
      this.build(imname, (err, exitCode) => {
        done(err, exitCode, imname)
      })
    })
  }

  build(imname, done) {
    if (!this.project.source.path) {
      return done(new ConfigError('providers not yet supported'))
    }
    this.io.emit('info', contextMessage(imname, this.project.build.context))

    getContext(this.project, (err, stream, dockerText) => {
      if (err) return done(err)
      this.io.emit('dockerfile', dockerText)

      console.log("BUILD TONG SFKDSLF")
      buildDocker(this.docker, stream, {
        dockerfile: this.project.build.dockerfile || 'Dockerfile',
        t: imname,
      }, this, done)
    })
  }

  test(name, done) {
    this.io.emit('section', 'test')

    const config = assign({}, this.project.test, {
      volumesFrom: [this.cacheContainer, this.dataContainer],
      image: name,
    })
    if (this.project.source.inPlace) {
      config.volumesFrom = [this.cacheContainer]
      config.binds = [this.project.source.path + ':/project']
    }
    // TODO maybe get more fancy here at some point
    runDocker(this.docker, config, this, (err, exitCode) => {
      if (err) this.io.emit('status', 'test:errored')
      else if (exitCode !== 0) {
        this.io.emit('status', 'test:failed')
      } else {
        this.io.emit('status', 'test:passed')
      }
      done(err, exitCode)
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

function ensureContainer(docker, id, volume, done) {
  docker.getContainer(id).inspect((err, res) => {
    if (err && err.statusCode !== 404) {
      return done(err)
    }
    if (!err) {
      return done(null, res.Id, false)
    }
    docker.createContainer({
      name: '/' + id,
      Image: 'busybox',
      Volumes: {
        [volume]: {}
      },
    }, (err, res) => {
      if (err) return done(err)
      done(null, res.id, true)
    })
  })
}

/*
function contextMessage(imname, value) {
  let ctx
  if (value === true) {
    ctx = 'will full project context'
  } else if (value === false) {
    ctx = 'with an empty context'
  } else {
    ctx = `with context from ${value}`
  }

  return `Building ${imname} ${ctx}`
}
*/

function interprom(io, prom) {
  let rejector
  function onInterrupt(done) {
    rejector(new InterruptError())
    io.off('interrupt', onInterrupt)
    done()
  }
  return Promise.race([
    new Promise((resolve, reject) => {
      io.on('interrupt', onInterrupt)
      rejector = reject
    }),
    prom
  ]).then(val => {
    io.off('interrupt', onInterrupt)
    return val
  })
}

