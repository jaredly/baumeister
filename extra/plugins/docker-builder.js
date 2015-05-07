
import {ConfigError} from '../../lib/errors'
import uuid from '../../lib/uuid'
import prom from '../../lib/prom'
import es from 'event-stream'
import path from 'path'
import fs from 'fs'
import tar from 'tar-stream'

class DockerBuilder {
  onBuild(project, build, onStep, config) {
    //if (config.context && config.context !== true) {
      //throw new ConfigError('Sub contexts not yet supported', 'docker-builder')
    //}
    onStep('environment', (builder, ctx, io) => {
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

function rebaseTar(stream, dr, stream2) {
  const extract = tar.extract()
  const pack = tar.pack()

  extract.on('entry', (header, stream, callback) => {
    header.name = header.name.split('/').slice(1).join('/')
    stream.pipe(pack.entry(header, callback))
  })
  extract.on('finish', () => {
    if (!stream2) {
      return pack.finalize()
    }
    const ex2 = tar.extract()
    ex2.on('entry', (header, stream, callback) => {
      header.name = path.relative(dr, '/' + header.name)
      stream.pipe(pack.entry(header, callback))
    })
    ex2.on('finish', () => {
      pack.finalize()
    })
    stream2.pipe(ex2)
  })

  stream.pipe(extract)
  return pack
}

function getStream(ctx, docker, config, build) {
  const name = config.dockerfile || 'Dockerfile'
  let context = config.context
  let dfIsContained
  if (context === true) context = ctx.projectDir
  else if (context) {
    dfIsContained = path.relative(context, name).indexOf('..') !== 0
    context = ctx.projectDir + '/' + context
  }

  if (ctx.projectContainer) {
    if (context) {
      if (dfIsContained) {
        return prom(done => {
          docker.getContainer(ctx.projectContainer).copy({
            Resource: context,
          }, (err, stream) => {
            if (err) {
              console.log(err)
              return done(new Error('Unable to copy data out of container'))
            }
            done(null, {
              stream: rebaseTar(stream, context),
              dockerfile: name.split('/').slice(1).join('/'),
            })
          })
        })
      } else {
        return prom(done => {
          docker.getContainer(ctx.projectContainer).copy({
            Resource: context,
          }, (err, stream) => {
            if (err) {
              console.log(err)
              return done(new Error('Unable to copy data out of container'))
            }
            docker.getContainer(ctx.projectContainer).copy({
              Resource: ctx.projectDir + '/' + name
            }, (err, dfStream) => {
              done(null, {
                stream: rebaseTar(stream, ctx.projectDir, dfStream),
                dockerfile: name,
              })
            })
          })
        })
      }
    }

    return prom(done => {
      docker.getContainer(ctx.projectContainer).copy({
        Resource: ctx.projectDir + '/' + name,
      }, (err, stream) => {
        if (err) {
          console.log(err)
          return done(new Error('Unable to copy data out of container'))
        }
        done(null, {stream, dockerfile: name.split('/').slice(-1)[0]})
      })
    })
  }

  if (!ctx.projectBind) {
    console.log(ctx)
    throw new ConfigError('No project directory configured', 'docker-builder')
  }

  const root = ctx.projectBind
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
        done(err ? new Error(err.error) : null)
      }))
  })
}

