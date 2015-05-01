
module.exports = {
  provide(build, ctx, out, done) {
    build.runCached({
      env: ['GIT_TERMINAL_PROMPT=0'],
      docker: {
        image: 'docker-ci/git',
      },
    }, {
      cachePath: 'project',
      projectPath: '.',
      get: `git clone ${config.source.repo} .`,
      update: 'git pull',
    }, done)
  }
}

