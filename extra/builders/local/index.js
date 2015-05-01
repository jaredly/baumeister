
module.exports = {
  id: 'local',
  builder: __dirname + '/local-build.js',
  globalConfig: {
    schema: {
      dataPath: {
        type: 'string',
        default: __dirname + '/.data',
      }
    },
  },
  projectConfig: {
    schema: {
      numToKeep: {
        type: 'number',
        default: -1,
      },
    }
  },
}

