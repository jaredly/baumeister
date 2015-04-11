
import es from 'event-stream'
import {parse} from 'shell-quote'
import path from 'path'

export default function runDocker(docker, config, out, done) {
  out.emit('status', 'testing')
  let err = null
  const stream = es.through()
  stream
    .pipe(es.split())
    .pipe(es.through(
      val => out.emit('stream', {stream: config.stream, value: val}),
      () => out.emit('stream', {stream: config.stream, end: true})))

  const create = {
    Tty: true,
    WorkingDir: path.join('/project', config.cwd || ''),
    Entrypoint: ['/bin/sh', '-x', '-c'],
    PublishAllPorts: true,
    Env: config.env || [],
  }

  const cmd = config.cmd

  docker.run(config.image, config.cmd, stream, create, (err, data, container) => {
    if (err) {
      out.emit('status', config.stream + ':error')
      return done(new Error('failed to run: ' + err.message))
    }
    if (data.StatusCode !== 0) {
      out.emit('status', config.stream + ':failed')
      return done(new Error(`run: nonzero exit code: ${data.StatusCode}`))
    }
    out.emit('status', 'passed')
    done()
  }).on('container', function (container) {
    container.defaultOptions.start.Binds = [config.path + ':/project:rw'];
  });
}

