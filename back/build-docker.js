
import uuid from './uuid'
import es from 'event-stream'

export default function buildDocker(docker, stream, config, out, done) {
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

