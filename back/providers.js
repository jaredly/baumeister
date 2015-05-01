
import runDocker from './run-docker'
import Docksh from './docksh'

function handleCached(docker, config, out, get, update, done) {

  const d = new Docksh(docker, config)

  let cached = false

  if (!config.cache) {
    return d.init()
      .then(_ => d.run(get, out))
      .then(_ => d.stopAndRemove())
      .then(_ => done())
      .catch(err => done(err))
  }

  d.init()
    .then(_ => {
      return d.runSilent('stat /cache/project')
    })
    .then(result => {
      if (result.code === 0) {
        cached = true
        out.emit('Using cache')
        return d.run('rsync -azrh /cache/project/ .', out)
      }
    })
    .then(_ => {
      if (cached) {
        return d.run(update, out)
          .then(_ => d.run('rsync -azrh --delete-after /project/ /cache/project/', out))
      } else {
        return d.run(get, out)
          .then(_ => d.run('cp -r /project /cache', out))
      }
    })
    .then(_ => d.stopAndRemove())
    .then(_ => done())
    .catch(err => done(err))
}

export default {
  git(docker, config, out, done) {

    handleCached(docker, {
      image: 'docker-ci/git',
      volumesFrom: config.volumesFrom,
      env: ['GIT_TERMINAL_PROMPT=0'],
    }, out, `git clone ${config.source.repo} .`, 'git pull', done)

  },

  script(docker, config, out, done) {

    handleCached(docker, {
      image: config.source.base || 'ubuntu',
      cache: config.source.cache,
      volumesFrom: config.volumesFrom,
    }, out, config.source.get, config.source.update, done)

  }
}

