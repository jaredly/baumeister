
import EventEmitter from 'eventemitter3'
import Docker from 'dockerode'
import es from 'event-stream'
import tar from 'tar-stream'
import tarfs from 'tar-fs'
import path from 'path'
import fs from 'fs'

export default class Runner extends EventEmitter {
  constructor() {
    this.docker = new Docker()
  }

  run(project, out, done) {
    this.prepareImage(project, out, (err, name) => {
      if (err) return done(err)
      this.test(project, name, out, done)
    })
  }

  prepareImage(project, out, done) {
    out.emit('status', 'prepare')
    if (project.build.prefab) {
      out.emit('info', 'Using prefab image: ' + project.build.prefab)
      return done(null, project.build.prefab)
    }
    const imname = 'docker-ci/' + project.name + ':test'
    this.docker.listImages((err, images) => {
      if (err) return done(err)
      const needToBuild = !images.some(im => im.RepoTags.indexOf(imname) !== -1)
      // console.log(JSON.stringify(images, null, 2))
      if (needToBuild) {
        this.build(project, imname, out, err => {
          if (err) return done(err, imname)
        })
      } else {
        out.emit('info', `Image ${imname} already built`)
        return done(err, imname, done)
      }
    })
  }

  build(project, imname, out, done) {
    if (!project.source.path) {
      return done(new Error('providers not yet supported'))
    }
    out.emit('status', 'build')
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

      out.emit('info', `Building ${imname} from ${project.build.dockerfile} ${ctx}`)
      out.emit('dockerfile', dockerText)
      buildDocker(this.docker, stream, {
        dockerfile: project.build.dockerfile || 'Dockerfile',
        t: imname,
      }, out, done)
    })
  }

  test(project, name, out, done) {
    done(new Error('test not impled'))
  }
}

function buildDocker(docker, stream, config, out, done) {
  let err = null
  docker.buildImage(stream, config, (err, stream) => {
    if (err) {
      return done(new Error('failed to build: ' + err.message))
    }
    stream
      .pipe(es.split())
      .pipe(es.parse())
      .pipe(es.through(value => {
        if (value.error) {
          err = value
        } else {
          out.emit('stream', {stream: 'build', value: value.stream})
        }
      }, () => {
        out.emit('stream', {stream: 'build', end: true, error: err})
        done(err)
      }))
  })
}

function getContext(project, done) {
  const name = project.build.dockerfile || 'Dockerfile'
  const fpath = path.join(project.source.path, name)
  fs.readFile(fpath, (err, data) => {
    if (err) {
      return done(new Error(`Dockerfile ${fpath} not found!`))
    }
    const dockerText = data.toString()
    if (project.build.context === true) {
      return done(null, tarfs.pack(project.source.path), dockerText)
    }
    let pack
    if (project.build.context === false) {
      pack = tar.pack()
    } else {
      pack = tarfs.pack(path.join(project.source.path, project.build.context))
    }
    pack.entry({name}, dockerText)
    pack.finalize()
    return done(null, pack, dockerText)
  })
}

