
module.exports = {
  builders: {
    docker: require('./extra/builders/docker'),
    local: require('./extra/builders/local'),
  },
  builderConfig: {
    docker: {
    },
    local: {
      basePath: '/tmp/localBuilder',
    },
  },
  defaultBuilder: 'local',
  plugins: {
    // 'file-watcher': require('./extra/plugins/file-watcher'),
    'docker-builder': require('./extra/plugins/docker-builder'),
    'local-provider': require('./extra/plugins/local'),
    'git-provider': require('./extra/plugins/git-provider'),
    'npm-install': require('./extra/plugins/npm-install'),
    'npm-test': require('./extra/plugins/npm-test'),
    'shell-provider': require('./extra/plugins/shell-provider'),
    'shell-tester': require('./extra/plugins/shell-tester'),
  },
  database: {
    path: __dirname + '/test/.test.db',
  },
  // TODO allow the admin to set plugin/config defaults here. Like for
  // `docker builder`, if they wanted numToKeep to default to 10. Or
  // something.
  // Another possibility is to have a "set defaults" section to the global
  // config.
}

