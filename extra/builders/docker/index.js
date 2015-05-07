
module.exports = {
  id: 'docker',
  title: 'Docker',
  builder: __dirname + '/builder.js',
  description: 'Run each build in an isolated docker container for ease and reproducability.',
  globalConfig: {
    schema: {
      connection: {
        type: 'union',
        title: 'Connection type',
        default: {
          socketPath: '/var/run/docker.sock',
        },
        optionTitles: {
          unix: 'Unix file socket',
          tcp: 'Http host',
        },
        test(val) {
          return val && val.has('host') ? 'tcp' : 'unix'
        },
        options: {
          unix: {
            socketPath: {
              type: 'text',
              title: 'Socket path',
              default: '/var/run/docker.sock',
            },
          },
          tcp: {
            host: {
              type: 'text',
              title: 'Hostname',
              default: 'localhost',
            },
            port: {
              type: 'text',
              title: 'Port',
              default: '3000',
            },
          },
        }
      },
      /*
      socket: {
        type: 'text',
        default: '//the whatever docker socket',
      },
      */
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

