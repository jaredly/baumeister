
import runDocker from './run-docker'

export default {
  git(docker, config, out, done) {
    const cmd = config.exists ? 'git pull' : 'git clone ' + config.source.repo + ' .'
    runDocker(docker, {
      cmd,
      path: config.dir,
      image: 'docker-ci/git',
      rmOnSuccess: true,
      env: ['GIT_TERMINAL_PROMPT=0'],
    }, out, (err, code) => {
      if (err) return done(err)
      if (code !== 0) {
        return done(new Error('non-zero exit code: ' + code))
      }
      done(err)
    })
  },

  script(docker, config, out, done) {
    const cmd = config.exists ? config.source.update : config.source.get
    runDocker(docker, {
      cmd,
      path: config.dir,
      rmOnSuccess: true,
      image: config.source.base || 'ubuntu'
    }, out, (err, code) => {
      if (err) return done(err)
      if (code !== 0) {
        return done(new Error('non-zero exit code: ' + code))
      }
      done(err)
    })
  }
}

