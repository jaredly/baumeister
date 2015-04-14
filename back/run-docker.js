
import es from 'event-stream'
import {parse} from 'shell-quote'
import path from 'path'
import uuid from './uuid'

export default function runDocker(docker, config, out, done) {
  const sid = uuid()
  const start = Date.now()
  out.emit('stream-start', {
    id: sid, 
    time: start,
    cmd: config.cmd
  })
  let err = null
  const stream = es.through()
  stream
    // .pipe(es.split())
    .pipe(es.through(
      val => out.emit('stream', {id: sid, value: val, time: Date.now()})
    )) // () => out.emit('stream-end', {stream: sid})))

  const create = {
    Tty: true,
    WorkingDir: path.join('/project', config.cwd || ''),
    Entrypoint: ['/bin/sh', '-x', '-c'],
    PublishAllPorts: true,
    Env: config.env || [],
  }

  const cmd = config.cmd

  docker.run(config.image, config.cmd, stream, create, (err, data, container) => {
    const end = Date.now()
    const dur = end - start
    if (err) {
      out.emit('stream-end', {
        id: sid,
        duration: dur,
        time: end,
        error: err.message
      })
      return done(new Error('failed to run: ' + err.message))
    }
    if (data.StatusCode !== 0) {
      out.emit('stream-end', {
        id: sid,
        duration: dur,
        time: end,
        exitCode: data.StatusCode,
        error: `Nonzero exit code: ${data.StatusCode}`
      })
      return done(null, data.StatusCode)
    }
    out.emit('stream-end', {
      id: sid,
      time: end,
      duration: dur,
      exitCode: data.StatusCode,
    })
    done(null, data.StatusCode)
  }).on('container', function (container) {
    container.defaultOptions.start.Binds = [config.path + ':/project:rw'];
  });
}

