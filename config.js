
module.exports = {
  builders: {
    docker: require('./extra/builders/docker'),
    local: require('./extra/builders/local'),
  },
  plugins: {
    'file-watcher': require('./extra/plugins/file-watcher'),
    'local': require('./extra/plugins/local'),
    // 'git-provider': require('./extra/plugins/git-provider'),
    // 'shell-provider': require('./extra/plugins/shell-provider'),
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

