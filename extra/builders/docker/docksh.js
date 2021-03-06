
import path from 'path'

import uuid from '../../../lib/uuid'
import prom from '../../../lib/prom'
import {ShellError} from '../../../lib/errors'

function envList(env) {
  if (!env) return []
  return Object.keys(env).forEach(name => `${name}=${env[name]}`)
}

function demux(stream, out, err) {
  var header = null;

  stream.on('readable', function() {
    header = header || stream.read(8);
    while (header !== null) {
      var type = header.readUInt8(0);
      var payload = stream.read(header.readUInt32BE(4));
      if (payload === null) break;
      if (type == 2) {
        err && err(payload);
      } else {
        out && out(payload);
      }
      header = stream.read(8);
    }
  });
}

/**
 * A Docker shell!
 *
 * Uses `sleep infinity` as the main process, so you can `exec` commands in
 * succession.
 *
 * Config: {
 *   image: (str) the docker image to use
 *   volumesFrom: (list<str>) container names to get volumes from
 *   env: (map<str, str>{key: val}) env vbls
 *   binds: (list<str "/host/path:/docker/path">) host mounted volumes
 *   cwd: (str) the current working directory for all commands
 * }
 */
export default class Docksh {
  constructor(docker, config) {
    this.docker = docker
    this.config = config
  }

  init() {
    return prom(done => {
      this.docker.createContainer({
        Image: this.config.image,
        Cmd: ['sleep infinity'],
        Entrypoint: ['/bin/bash', '-e', '-c'],
        // VolumesFrom: this.config.volumesFrom,
        Tty: true,
        PublishAllPorts: true,
        Env: envList(this.config.env),
        WorkingDir: path.join('/project', this.config.cwd || ''),
      }, (err, container) => {
        if (err) return done(err)
        this.container = container
        container.defaultOptions.start.Binds = this.config.binds
        container.defaultOptions.start.VolumesFrom = this.config.volumesFrom
        container.start((err, data) => {
          if (err) return done(err)
          done()
        })
      })
    })
  }

  stop() {
    return prom(done => this.container.stop(done))
  }

  remove() {
    return prom(done => this.container.remove(done))
  }

  stopAndRemove() {
    return this.stop().then(_ => this.remove())
  }

  runSilent(cmd, io) {
    let resolved = false
    let promResolver
    function onInterrupt(done) {
      if (resolved) return // control has been passed off
      promResolver(new InterruptError())
      this.stop()
        .then(_ => done(), err => done(err))
      resolved = true
    }
    io.on('interrupt', onInterrupt)

    return prom(_done => {
      const done = function () {
        if (resolved) return console.warn('runSilent > already resolved')
        resolved = true
        io.off('interrupt', onInterrupt)
        return _done.apply(this, arguments)
      }
      promResolver = done

      this.container.exec({
        Tty: true,
        Cmd: ['/bin/bash', '-c', cmd],
        AttachStdout: true,
        AttachStderr: true,
      }, (err, exec) => {
        if (err) return done(err)
        exec.start({}, (err, stream) => {
          if (err) return done(err)
          let out = ''
          const start = Date.now()
          // slice(8) is to chop of the multiplex headers
          // https://github.com/docker/docker/issues/7375#issuecomment-51462963
          // stream.setEncoding('utf8')
          demux(stream, chunk => out += chunk.toString('utf8'));
          stream//.on('data', chunk => out += chunk)
          .on('error', err => console.log("ERR", err))
          .on('end', () => {
            const duration = Date.now() - start
            exec.inspect((err, data) => {
              if (err) {
                console.error('inspect exec', err)
                return done(new Error('failed to inspect exec'))
              }
              if (data.Running) {
                return done(new Error('exec is still running'))
              }
              done(null, {out, code: data.ExitCode, duration})
            })
          })
        })
      })
    })
  }

  run(cmd, io, plugin, clean) {
    const sid = uuid()
    const start = Date.now()
    io.emit('stream-start', {
      id: sid, 
      time: start,
      plugin,
      cleanCmd: clean,
      cmd,
    })

    let resolved = false
    let promResolver
    function onInterrupt(done) {
      if (resolved) return // control has been passed off
      promResolver(new InterruptError())
      this.container.stop(done)
      resolved = true
    }
    io.on('interrupt', onInterrupt)

    return prom(_done => {
      const done = function () {
        if (resolved) return console.warn('runSilent > already resolved')
        resolved = true
        io.off('interrupt', onInterrupt)
        return _done.apply(this, arguments)
      }
      promResolver = done

      this.container.exec({
        Tty: true,
        Cmd: ['/bin/bash', '-e', '-c', cmd],
        AttachStdout: true,
        AttachStderr: true
      }, (err, exec) => {
        if (err) return done(err)
        exec.start({}, (err, stream) => {
          if (err) return done(err)
          let out = ''
          // stream.setEncoding('utf8');
          demux(stream, chunk => {
            chunk = chunk.toString('utf8')
            io.emit('stream', {
              id: sid,
              value: chunk,
              time: Date.now()
            })
            out += chunk;
          });
          stream
            // .on('data', chunk => { })
            .on('error', err => {
              console.log('ERRR', err)
            })
            .on('end', () => {
              const end = Date.now()
              const dur = end - start
              exec.inspect((err, data) => {
                if (err) return done(new Error('failed to get info on `exec`'))
                if (data.Running) {
                  return done(new Error("exec is still running..." + data.ID))
                }
                if (data.ExitCode != 0) {
                  io.emit('stream-end', {
                    id: sid,
                    time: end,
                    duration: dur,
                    error: "non-zero exit code: " + data.ExitCode,
                    exitCode: data.ExitCode
                  })
                  return done(new ShellError(cmd, data.ExitCode))
                }
                io.emit('stream-end', {
                  id: sid,
                  time: end,
                  duration: dur,
                })
                done(null, {out, code: data.ExitCode, duration: dur})
              })
            })
        })
      })
    })
  }
}

