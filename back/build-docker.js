
import es from 'event-stream'

export default function buildDocker(docker, stream, config, out, done) {
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

