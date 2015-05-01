
module.exports = {
  id: 'docker',
  builder: __dirname + '/docker-build.js',
  globalConfig: {
    form() {
    },
    schema: {
      socket: {
        type: 'string',
        default: '//the whatever docker socket',
      },
    },
  },
  projectConfig: {
    form() {
    },
    schema: {
      numToKeep: {
        type: 'number',
        default: -1,
      },
    },
  },
}

