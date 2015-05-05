
module.exports = {
  id: 'local',
  title: 'Local',
  builder: __dirname + '/local-build.js',
  description: 'Builds are stored in a local directory and built using the current system environment. This is easiest to setup, but doesn\'t offer you isolation -- your current envionment could pollute the system, especially if you implicitly rely on globally installed packages.',
  globalConfig: {
    schema: {
      dataPath: {
        type: 'text',
        default: __dirname + '/.data',
      }
    },
  },
  projectConfig: {
    schema: {
      numToKeep: {
        type: 'number',
        title: 'Number of builds to keep',
        default: -1,
      },
    }
  },
}

