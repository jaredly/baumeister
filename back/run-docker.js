
import es from 'event-stream'
import {parse} from 'shell-quote'
import path from 'path'

export default function runDocker(docker, project, imname, out, done) {
  out.emit('status', 'testing')
  let err = null
  const stream = es.through()
  stream
    .pipe(es.split())
    .pipe(es.through(
      val => out.emit('stream', {stream: 'run', value: val}),
      () => out.emit('stream', {stream: 'run', end: true})))

  const create = {
    Tty: true,
    WorkingDir: path.join('/project', project.test.cwd || ''),
    Entrypoint: ['/bin/sh', '-x', '-c'],
    PublishAllPorts: true,
    Env: project.env || [],
  }

  const cmd = project.test.cmd // ['sh', '-x', '-c', project.test.cmd] // parse(project.test.cmd)

  docker.run(imname, cmd, stream, create, (err, data, container) => {
    if (err) {
      out.emit('status', 'run:error')
      return done(new Error('failed to run: ' + err.message))
    }
    if (data.StatusCode !== 0) {
      out.emit('status', 'run:failed')
      return done(new Error(`run: nonzero exit code: ${data.StatusCode}`))
    }
    out.emit('status', 'passed')
    done()
  }).on('container', function (container) {
    container.defaultOptions.start.Binds = [project.source.path + ':/project:rw'];
  });
}

