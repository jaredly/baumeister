
module.exports = {
  id: 'docker',
  title: 'Docker',
  builder: __dirname + '/builder.js',
  description: 'Run each build in an isolated docker container for ease and reproducability.',
  globalConfig: {
    form() {
      const {Radio, FormSection} = require('formative')
    },
    schema: {
      socket: {
        type: 'text',
        default: '//the whatever docker socket',
      },
    },
  },

  projectConfig: {
    schema: {
      numToKeep: {
        type: 'number',
        title: 'Number of builds to keep',
        default: -1,
      },
    },
  },
}

