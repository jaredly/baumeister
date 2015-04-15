
import path from 'path'

import uuid from './uuid'
import prom from './prom'

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
        Entrypoint: ['/bin/sh', '-x', '-c'],
        Tty: true,
        PublishAllPorts: true,
        Env: this.config.env || [],
        // TODO think more about the working dir?
        WorkingDir: path.join('/project', this.config.cwd || ''),
      }, (err, container) => {
        if (err) return done(err)
        this.container = container
        container.defaultOptions.start.Binds = [this.config.path + ':/project:rw'];
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

  run(cmd, out) {
    const sid = uuid()
    const start = Date.now()
    out.emit('stream-start', {
      id: sid, 
      time: start,
      cmd: cmd
    })

    let interrupt = done => {
      this.container.stop(done)
    }
    out.on('interrupt', interrupt)

    return prom(done => {
      this.container.exec({
        Tty: true,
        Cmd: ['/bin/sh', '-x', '-c', cmd],
        AttachStdout: true,
        AttachStderr: true
      }, (err, exec) => {
        if (err) return done(err)
        exec.start({}, (err, stream) => {
          if (err) return done(err)
          stream
            .on('data', chunk => {
              out.emit('stream', {
                id: sid,
                value: chunk.toString('utf8'),
                time: Date.now()
              })
            })
            .on('error', err => {
              console.log('ERRR', err)
            })
            .on('end', () => {
              const end = Date.now()
              const dur = end - start
              exec.inspect((err, data) => {
                out.off('interrupt', interrupt)
                if (err) return done(new Error('failed to get info on `exec`'))
                if (data.Running) {
                  return done(new Error("exec is still running..." + data.ID))
                }
                if (data.ExitCode != 0) {
                  out.emit('stream-end', {
                    id: sid,
                    time: end,
                    duration: dur,
                    error: "non-zero exit code: " + data.ExitCode,
                    exitCode: data.ExitCode
                  })
                  return done(new Error("Command exited with non-zero exit code"))
                }
                out.emit('stream-end', {
                  id: sid,
                  time: end,
                  duration: dur,
                })
                done()
              })
            })
        })
      })
    })
  }
}

