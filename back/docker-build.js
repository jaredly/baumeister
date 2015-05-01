
import Docker from 'dockerode'
import path from 'path'
import fs from 'fs'

import assign from 'object-assign'
import providers from './providers'
import Replayable from './replayable'
import buildDocker from './build-docker'
import ConfigError from './config-error'
import getContext from './get-context'
import runDocker from './run-docker'


export default DockerBuild extends BaseBuild {
  static type = 'docker'

  constructor(project, id, config) {
    super(project, id, config)
    this.docker = new Docker() // TODO use config to custom docker connection
    this.cacheContainer = `dci-${this.project.id}-cache`
    this.dataContainer = `dci-${this.id}-data`
    this.runnerOptions = {
      volumesFrom: [],
      binds: [],
    }
  }

  init() {
    const promises = []
    if (this.dataContainer) {
      this.runnerOptions.volumesFrom.push(this.dataContainer)
      promises.push(prom(done => {
        this.docker.createContainer({
          name: '/' + this.dataContainer,
          Image: 'busybox',
          Volumes: {'/project': {}},
        }, (err, res) => {
          if (err) return done(err)
          this.emit('info', `Created data container ${this.dataContainer} (${res.id})`)
          done()
        })
      }))
    }
    if (this.cacheContainer) {
      this.runnerOptions.volumesFrom.push(this.cacheContainer)
      promises.push(prom(done => {
        ensureContainer(this.docker, this.cacheContainer, '/cache', (err, id, created) => {
          if (err) return done(err)
          this.emit('info', `${created ? 'Created' : 'Using'} cache container ${this.cacheContainer} (${id})`)
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

  runner(config) {
    const volumesFrom = [this.cacheContainer]
    const binds = []
    if (!config.noDataContainer) {
      volumesFrom.push(this.dataContainer)
    }
    /*
    if (this.project.source.path) {
      if (this.project.source.inPlace) {
        binds.push(`${this.project.source.path}:/project:rw`)
      } else {
        binds.push(`${this.project.source.path}:/localProject:rw`)
      }
    } else {
      volumesFrom.push(this.dataContainer)
    }
    */
    const sh = new Docksh(this.docker, {
      image: config.docker && config.docker.image || 'ubuntu',
      env: config.env,
      volumesFrom,
      binds,
      cwd: config.cwd || '/project',
      // TODO binds for local projects
    })
    return {
      init: sh.init.bind(sh),
      run(cmd, options) {
        if (options.silent) {
          return sh.runSilent(cmd)
            .then(result => {
              if (result.code !== 0 && !config.badExitOK) {
                throw new Error(`Command exited with code ${result.code}`)
              }
              return result
            })
        }
        return sh.run(cmd, this)
          .then(code => {
            if (code !== 0 && !config.badExitOK) {
              throw new Error(`Command exited with code ${code}`)
            }
            return result
          })
      },
      stop() {
        return config.dontRemove ? sh.stop() : sh.stopAndRemove()
      }
      cacheDir: '/cache',
      projectDir: '/project',
    }
  }

  clearCache(done) {
    this.docker.getContainer(this.cacheContainer).remove({v: 1}, (err, data) => {
      if (err) {
        if (err.statusCode === 404) return done()
        return done(err)
      }
      done()
    })
  }

  ensureDataContainers(done) {
    const cache = this.cacheContainer
    ensureContainer(this.docker, cache, '/cache', (err, id, created) => {
      if (err) return done(err)
      this.emit('info', `${created ? 'Created' : 'Using'} cache container ${cache} (${id})`)

      if (this.project.source.path && this.project.source.inPlace) {
        return done(null)
      }
h;
      const data = this.dataContainer
      this.docker.createContainer({name: '/' + data, Image: 'busybox', Volumes: {'/project': {}}}, (err, res) => {
        if (err) return done(err)
        this.emit('info', `Created data container ${data} (${res.id})`)
        done(null)
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
          this.emit('info', `Local project ${this.project.source.path}`)
          return done()
        }
        console.log('GET FROM', this.project.source.path)
        this.emit('info', `Copying local project from ${this.project.source.path}`)
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
      this.emit('error', err.message)
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
    this.emit('section', 'prepare-image')
    if (this.project.build.prefab) {
      this.emit('info', 'Using prefab image: ' + this.project.build.prefab)
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
        this.emit('info', `Image ${imname} already built`)
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
    this.emit('info', contextMessage(imname, this.project.build.context))

    getContext(this.project, (err, stream, dockerText) => {
      if (err) return done(err)
      this.emit('dockerfile', dockerText)

      console.log("BUILD TONG SFKDSLF")
      buildDocker(this.docker, stream, {
        dockerfile: this.project.build.dockerfile || 'Dockerfile',
        t: imname,
      }, this, done)
    })
  }

  test(name, done) {
    this.emit('section', 'test')

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
      if (err) this.emit('status', 'test:errored')
      else if (exitCode !== 0) {
        this.emit('status', 'test:failed')
      } else {
        this.emit('status', 'test:passed')
      }
      done(err, exitCode)
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
      console.log(res)
      done(null, res.id, true)
    })
  })
}

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

