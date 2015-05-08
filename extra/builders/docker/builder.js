
import Docker from 'dockerode'
import path from 'path'
import fs from 'fs'

import Promise from 'bluebird'
import assign from 'object-assign'
import BaseBuild from '../../../lib/base-build'
import prom from '../../../lib/prom'
import Docksh from './docksh'
import mkdirp from 'mkdirp'

import {ConfigError, InterruptError, ShellError} from '../../../lib/errors'


export default class DockerBuilder extends BaseBuild {
  static type = 'docker'

  constructor(io, project, id, globalConfig, projectConfig) {
    super(io, project, id, globalConfig, projectConfig)
    this.docker = new Docker(globalConfig.connection) // TODO use config to custom docker connection
    this.ctx = {
      cacheContainer: `dci-${this.project.id}-cache`,
      projectContainer: `dci-${this.id}-project`,
      projectBind: null,
      cacheBind: null,
      runnerConfig: {
        defaultImage: 'jaeger/node',
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
    // create project container
    if (this.ctx.projectContainer) {
      promises.push(prom(done => {
        this.docker.createContainer({
          name: '/' + this.ctx.projectContainer,
          Image: 'busybox',
          Volumes: {'/project': {}},
        }, (err, res) => {
          if (err) return done(err)
          this.io.emit('info', `Created project container ${this.ctx.projectContainer} (${res.id})`)
          done()
        })
      }))
    } else if (this.ctx.projectBind) {
      promises.push(prom(done => mkdirp(this.ctx.projectBind, done)))
    }

    // check for & create cache container
    if (this.ctx.cacheContainer) {
      promises.push(prom(done => {
        ensureContainer(this.docker, this.ctx.cacheContainer, '/cache', (err, id, created) => {
          if (err) return done(err)
          this.io.emit('info', `${created ? 'Created' : 'Using'} cache container ${this.ctx.cacheContainer} (${id})`)
          done()
        })
      }))
    } else if (this.ctx.cacheBind) {
      promises.push(prom(done => mkdirp(this.ctx.cacheBind, done)))
    }

    return prom(done => {
      this.docker.version((err, data) => {
        if (err) return done(new ConfigError(`Unable to connect to docker daemon: ${err.message}`, 'docker builder', `Current config is: ${JSON.stringify(this.globalConfig)}. Make sure the docker daemon is running and accessible`))
        done()
      })
    }).then(() => Promise.all(promises))
  }

  shell(config) {
    config = config || {}
    const io = this.io
    const rConfig = this.ctx.runnerConfig

    const volumes = rConfig.volumesFrom.slice()
    if (this.ctx.projectContainer) {
      volumes.push(this.ctx.projectContainer)
    }
    if (this.ctx.cacheContainer) {
      volumes.push(this.ctx.cacheContainer)
    }

    const binds = rConfig.binds.slice()
    if (this.ctx.projectBind) {
      binds.push(this.ctx.projectBind + ':' + this.ctx.projectDir + ':rw')
    }
    if (this.ctx.cacheBind) {
      binds.push(this.ctx.cacheBind + ':' + this.ctx.cacheDir + ':rw')
    }

    const sh = new Docksh(this.docker, {
      volumesFrom: volumes,
      binds: binds,
      env: assign(rConfig.env, config.env),

      image: config.docker && config.docker.image || rConfig.defaultImage,
      cwd: config.cwd || '',
    })

    return {
      init() {
        return interprom(io, sh.init())
      },
      run(cmd, options) {
        if ('string' !== typeof cmd) {
          options = cmd
          cmd = cmd.cmd
        }
        if (!cmd) {
          throw new Error(`No command given`)
        }
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
        return sh.run(cmd, io, config.plugin, options.cleanCmd)
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

  pluginProxy(id) {
    const proxy = super.pluginProxy(id)
    proxy.docker = this.docker
    return proxy
  }

  /*
  // TODO make this work again
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

