
import Docker from 'dockerode'

import assign from 'object-assign'
import providers from './providers'
import Replayable from './replayable'
import buildDocker from './build-docker'
import getContext from './get-context'
import runDocker from './run-docker'
import path from 'path'
import fs from 'fs'

function ensureDir(dir, done) {
  fs.exists(dir, exists => {
    if (exists) return done(null, true)
    fs.mkdir(dir, err => {
      if (err) return done(new Error(`Could not create path ${dir}`))
      done(null, false)
    })
  })
}

export default class Runner extends Replayable {
  constructor(project, basePath) {
    super()
    this.docker = new Docker()
    this.project = project
    this.basePath = basePath
    this.state = {}
  }

  run(done) {
    this.getProject((err) => {
      if (err) return done(err)
      this.prepareImage((err, name) => {
        if (err) return done(err)
        this.test(name, done)
      })
    })
  }

  getProject(done) {
    this.emit('section', 'get-project')
    if (this.project.source.path) {
      this.emit('info', `Local project ${this.project.source.path}`)
      this.state.path = this.project.source.path
      this.state.inPlace = true
      this.state.newPath = false
      return done()
    }

    if (!this.basePath) {
      throw new Error('No basepath specified')
    }
    const dir = path.join(this.basePath, this.project.name)

    ensureDir(dir, (err, exists) => {
      if (err) return done(err)
      this.state.path = dir
      this.state.newPath = !exists

      const pro = providers[this.project.source.provider]
      if (!pro) {
        const err = new Error(`Unknown provider ${this.project.source.provider}`)
        this.emit('error', err.message)
        return done(err)
      }

      const config = {dir, exists, source: this.project.source.config}

      pro(this.docker, config, this, err => {
        done(err)
      })
    })
  }

  prepareImage(done) {
    this.emit('section', 'prepare-image')
    if (this.project.build.prefab) {
      this.emit('info', 'Using prefab image: ' + this.project.build.prefab)
      return done(null, this.project.build.prefab)
    }
    const imname = 'docker-ci/' + this.project.name + ':test'
    if (!this.project.build.noRebuild) {
      return this.build(imname, err => {
        done(err, imname)
      })
    }
    this.docker.listImages((err, images) => {
      if (err) return done(err)
      const needToBuild = !images.some(
        im => im.RepoTags.indexOf(imname) !== -1)
      if (!needToBuild) {
        this.emit('info', `Image ${imname} already built`)
        return done(err, imname)
      }
      this.build(imname, err => {
        done(err, imname)
      })
    })
  }

  build(imname, done) {
    if (!this.project.source.path) {
      return done(new Error('providers not yet supported'))
    }
    this.emit('info', contextMessage(imname, this.project.build.context))

    getContext(this.project, (err, stream, dockerText) => {
      if (err) return done(err)
      this.emit('dockerfile', dockerText)

      buildDocker(this.docker, stream, {
        dockerfile: this.project.build.dockerfile || 'Dockerfile',
        t: imname,
      }, this, done)
    })
  }

  test(name, done) {
    this.emit('section', 'test')
    const config = assign({}, this.project.test, {
      path: this.state.path,
      stream: 'test',
      image: name,
    })
    // TODO maybe get more fancy here at some point
    runDocker(this.docker, config, this, (err, exitCode) => {
      if (err) this.emit('status', 'test:errored')
      else if (exitCode !== 0) this.emit('status', 'test:failed')
      else this.emit('status', 'test:passed')
      this.emit('section', 'cleanup')
      runDocker(this.docker, {
        path: this.state.path,
        image: name,
        cmd: 'chown -R `stat -c "%u:%g" /project` /project'
      }, this, _ => done(err, exitCode))
    })
  }
}

function contextMessage(imname, value) {
  let ctx
  if (value === true) {
    ctx = 'will full project'
  } else if (value === false) {
    ctx = 'with an empty context'
  } else {
    ctx = `with context from ${value}`
  }

  return `Building ${imname} from ${value} ${ctx}`
}

