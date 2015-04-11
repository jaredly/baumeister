
import runDocker from './run-docker'

export default {
  script(docker, config, out, done) {
    const cmd = config.exists ? config.source.update : config.source.get
    runDocker(docker, {
      cmd,
      path: config.dir,
      stream: 'get-project',
      image: config.source.base || 'ubuntu'
    }, out, err => {
      done(err)
    })
  }
}

