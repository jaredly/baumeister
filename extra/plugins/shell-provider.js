
module.exports = {
  provide(build, ctx, out, done) {
    build.runCached({
      docker: {
        image: config.source.base || 'ubuntu',
      },
    }, {
      cachePath: 'project',
      projectPath: '.',
      get: config.source.get,
      update: config.source.update,
    }, done)
  }
}
