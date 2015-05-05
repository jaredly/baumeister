
import {ConfigError} from '../../lib/errors'
import uuid from '../../lib/uuid'
import prom from '../../lib/prom'
import es from 'event-stream'
import path from 'path'
import fs from 'fs'
import tar from 'tar-stream'

class DockerBuilder {
  constructor(manager, app) {
    this.manager = manager
    this.app = app
  }

  onBuild(project, build, onStep, config) {
    if (config.context) {
      throw new ConfigError('Contexts not yet supported', 'docker-builder')
    }
    onStep('environment', (builder, ctx, io) => {
      console.log(builder)
      return getStream(ctx, builder.docker, config, build)
      .then(({stream, dockerfile}) => {
        const imageTag = 'jaeger-build/' + project.id
        return prom(done => {
          buildDocker(builder.docker, stream, {
            t: imageTag,
            dockerfile,
          }, io, err => {
            if (err) return done(err)
            ctx.runnerConfig.defaultImage = imageTag
            done()
          })
        })
      })
    })
  }
}

function getStream(ctx, docker, config, build) {
  const name = config.dockerfile || 'Dockerfile'
  if (ctx.dataContainer) {
    return prom(done => {
      builder.docker.getContainer(ctx.dataContainer).copy({
        Resource: ctx.projectDir + '/' + name,
      }, (err, stream) => {
        if (err) return done(err)
        done(null, {stream, dockerfile: name.split('/').slice(-1)[0]})
      })
    })
  }

  if (!build.config.plugins['local-provider']) {
    throw new ConfigError('Unknown plugin has prevented the creation of a data container. File an issue if you want compatability.', 'docker-builder')
  }
  const root = build.config.plugins['local-provider'].path
  const fpath = path.join(root, name)
  return prom(done => {
    fs.readFile(fpath, (err, dockerText) => {
      if (err) return done(new ConfigError(`Dockerfile ${fpath} not found`, 'docker-builder'))
      const pack = tar.pack()
      pack.entry({name}, dockerText)
      pack.finalize()
      done(null, {stream: pack, dockerfile: name})
    })
  })
}

export default {
  id: 'docker-builder',
  title: 'Docker Builder',
  description: 'Build a dockerfile to test in',
  buildTypes: ['docker'],
  plugin: DockerBuilder,
  projectConfig: {
    schema: {
    }
  }
}

function buildDocker(docker, stream, config, out, done) {
  let err = null
  const sid = uuid()
  const start = Date.now()
  docker.buildImage(stream, config, (err, stream) => {
    if (err) {
      return done(new Error('failed to build docker image: ' + err.message))
    }
    out.emit('stream-start', {
      id: sid, 
      time: start,
      title: 'building docker image',
    })
    stream
      .pipe(es.split())
      .pipe(es.parse())
      .pipe(es.through(value => {
        if (value.error) {
          err = value
        } else {
          out.emit('stream', {id: sid, value: value.stream, time: Date.now()})
        }
      }, () => {
        const end = Date.now()
        const dur = end - start
        out.emit('stream-end', {
          id: sid,
          time: end,
          duration: dur,
          error: err ? err.error : null,
        })
        done(null, err ? 27 : null)
      }))
  })
}

function getContext(project, done) {
  const name = project.build.dockerfile || 'Dockerfile'
  const fpath = path.join(project.source.path, name)
  fs.readFile(fpath, (err, data) => {
    if (err) {
      console.log('Failed to get dockerfile', err)
      return done(new ConfigError(`Dockerfile ${fpath} not found!`))
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

