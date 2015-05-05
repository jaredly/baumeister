
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
    'file-watcher': require('./extra/plugins/file-watcher'),
    'local-provider': require('./extra/plugins/local'),
    'git-provider': require('./extra/plugins/git-provider'),
    'npm-install': require('./extra/plugins/npm-install'),
    'npm-test': require('./extra/plugins/npm-test'),
    'shell-provider': require('./extra/plugins/shell-provider'),
    'shell-tester': require('./extra/plugins/shell-tester'),
  },
  database: {
    inMemory: true,
  },
}

