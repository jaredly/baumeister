
import EventEmitter from 'eventemitter3'
import Docker from 'dockerode'

import buildDocker from './build-docker'
import getContext from './get-context'
import runDocker from './run-docker'

export default class Runner extends EventEmitter {
  constructor() {
    this.docker = new Docker()
    this.history = []
    this.piping = []
  }

  pipe(em) {
    // replay the past
    this.history.forEach(v => em.emit(v.evt, v.val))
    this.piping.push(em)
  }

  unpipe(em) {
    const ix = this.piping.indexOf(em)
    if (ix === -1) return false
    this.piping.splice(ix, 1)
    return true
  }

  on(evt, fn) {
    EventEmitter.prototype.on.call(this, evt, fn)
  }

  emit(evt, val) {
    this.history.push({evt, val, time: new Date()})
    this.piping.forEach(p => p.emit(evt, val))
    EventEmitter.prototype.emit.call(this, evt, val)
  }

  run(project, done) {
    this.prepareImage(project, (err, name) => {
      if (err) return done(err)
      runDocker(this.docker, project, name, this, done)
    })
  }

  prepareImage(project, done) {
    this.emit('status', 'prepare')
    if (project.build.prefab) {
      this.emit('info', 'Using prefab image: ' + project.build.prefab)
      return done(null, project.build.prefab)
    }
    const imname = 'docker-ci/' + project.name + ':test'
    this.build(project, imname, err => {
      done(err, imname)
    })
    /* TODO maybe just dump this. Might be an interesting option, but not
     * really?
    this.docker.listImages((err, images) => {
      if (err) return done(err)
      const needToBuild = !images.some(im => im.RepoTags.indexOf(imname) !== -1)
      // console.log(JSON.stringify(images, null, 2))
      if (!needToBuild) {
        this.emit('info', `Image ${imname} already built`)
        return done(err, imname)
      }
    })
    */
  }

  build(project, imname, done) {
    if (!project.source.path) {
      return done(new Error('providers not yet supported'))
    }
    this.emit('status', 'build')
    getContext(project, (err, stream, dockerText) => {
      if (err) return done(err)
      let ctx
      if (project.build.context === true) {
        ctx = 'will full project'
      } else if (project.build.context === false) {
        ctx = 'with an empty context'
      } else {
        ctx = `with context from ${project.build.context}`
      }

      this.emit('info', `Building ${imname} from ${project.build.dockerfile} ${ctx}`)
      this.emit('dockerfile', dockerText)
      buildDocker(this.docker, stream, {
        dockerfile: project.build.dockerfile || 'Dockerfile',
        t: imname,
      }, this, done)
    })
  }
}

