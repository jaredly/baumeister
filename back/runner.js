
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

export default class Runner extends Replayable {
  constructor(project, id, basePath) {
    super()
    this.id = id
    this.docker = new Docker()
    this.project = project
    this.basePath = basePath
    this.state = {}
    this.stopper = null
    this.stopped = false
    this.cacheContainer = `dci-${this.project.id}-cache`
    this.dataContainer = `dci-${this.id}-data`
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
      this.getProject((err) => {
        if (err) return finish(err)
        this.prepareImage((err, exitCode, name) => {
          if (err || exitCode) return finish(err, exitCode)
          this.test(name, finish)
        })
      })
    })
  }

  stop(done) {
    this.emit('interrupt', done)
  }

  ensureDataContainers(done) {
    const cache = this.cacheContainer
    ensureContainer(this.docker, cache, '/cache', (err, id, created) => {
      if (err) return done(err)
      this.emit('info', `${created ? 'Created' : 'Using'} cache container ${cache} (${id})`)

      if (this.project.source.path && this.project.source.inPlace) {
        return done(null)
      }

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
      if (this.project.source.inPlace) {
        this.emit('info', `Local project ${this.project.source.path}`)
        return done()
      }
      return runDocker(this.docker, {
        image: 'busybox',
        binds: [this.project.source.path + ':/localProject:rw'],
        volumesFrom: [this.dataContainer],
        cmd: 'cp -r /localProject/* /project',
      }, this, done)
    }

    if (!this.basePath) {
      throw new ConfigError('No basepath specified')
    }
    const dir = path.join(this.basePath, this.project.id.replace(/:/, '_'))

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

