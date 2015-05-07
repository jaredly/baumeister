
import {EventEmitter} from 'events'
import expect from 'expect.js'
import memdown from 'memdown'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import fs from 'fs'

import uuid from '../lib/uuid'
import setup from '../cli/setup'

process.setMaxListeners(100)

const fixtures = {
  // docker things
  docker_ctx: {
    plugins: {
      'local-provider': {
        path: __dirname + '/fixtures/docker-ctx',
        inPlace: false,
      },
      'docker-builder': {
        dockerfile: 'Docker.build',
        context: true,
      },
      'shell-tester': {
        command: 'grep "hello root" /app/world.txt; cat /app/world.txt; grep base /app/world.txt',
      },
    },
    builder: {
      id: 'docker',
    },
  },

  docker_ctx_outside: {
    plugins: {
      'local-provider': {
        path: __dirname + '/fixtures/docker-ctx',
        inPlace: false,
      },
      'docker-builder': {
        dockerfile: 'Docker.outside',
        context: 'other',
      },
      'shell-tester': {
        command: 'grep "hello other" /app/world.txt; cat /app/world.txt; grep outside /app/world.txt',
      },
    },
    builder: {
      id: 'docker',
    },
  },

  docker_ctx_inside: {
    plugins: {
      'local-provider': {
        path: __dirname + '/fixtures/docker-ctx',
        inPlace: false,
      },
      'docker-builder': {
        dockerfile: 'other/Docker.inside',
        context: 'other',
      },
      'shell-tester': {
        command: 'grep "hello other" /app/world.txt; cat /app/world.txt; grep inside /app/world.txt',
      },
    },
    builder: {
      id: 'docker',
    },
  },

  docker_noctx: {
    plugins: {
      'local-provider': {
        path: __dirname + '/fixtures/docker-ctx',
        inPlace: false,
      },
      'docker-builder': {
        dockerfile: 'Docker.noctx',
        context: false,
      },
      'shell-tester': {
        command: 'grep hello /world.txt',
      },
    },
    builder: {
      id: 'docker',
    },
  },

  docker_noctx_ip: {
    plugins: {
      'local-provider': {
        path: __dirname + '/fixtures/docker-ctx',
        inPlace: true,
      },
      'docker-builder': {
        dockerfile: 'Docker.noctx',
        context: false,
      },
      'shell-tester': {
        command: 'grep hello /world.txt',
      },
    },
    builder: {
      id: 'docker',
    },
  },

  local: {
    plugins: {
      'local-provider': {
        path: __dirname + '/fixtures/local-project'
      },
      'shell-tester': {
        command: 'make test; pwd',
        docker: {
          image: 'jaredly/node',
        },
      },
    },
    output: 'working local\n{{projectDir}}',
  },
  localInPlace: {
    plugins: {
      'local-provider': {
        path: __dirname + '/fixtures/local-project',
        inPlace: true,
      },
      'shell-tester': {
        command: 'make test; pwd',
        docker: {
          image: 'jaredly/node',
        },
      },
    },
    output: `working local\n${__dirname}/fixtures/local-project`,
  },
  git: {
    plugins: {
      'git-provider': {
        repo: __dirname + '/fixtures/local-git',
      },
      'shell-tester': {
        command: 'make test; pwd',
        docker: {
          image: 'jaredly/node',
        },
      },
    },
    output: 'working git\n{{projectDir}}',
  },
  localDocker: {
    builder: {
      id: 'docker',
    },
    plugins: {
      'local-provider': {
        path: __dirname + '/fixtures/local-project'
      },
      'shell-tester': {
        command: 'make test; pwd',
        docker: {
          image: 'jaredly/node',
        },
      },
    },
    output: 'working local\n{{projectDir}}',
  },
  localDockerInPlace: {
    builder: {
      id: 'docker',
    },
    plugins: {
      'local-provider': {
        path: __dirname + '/fixtures/local-project',
        inPlace: true,
      },
      'shell-tester': {
        command: 'make test; pwd',
        docker: {
          image: 'jaredly/node',
        },
      },
    },
    output: 'working local\n{{projectDir}}',
  },
  gitDocker: {
    builder: {
      id: 'docker',
    },
    plugins: {
      'git-provider': {
        repo: 'https://github.com/notablemind/loco',
      },
      'shell-tester': {
        command: 'echo "working git"; pwd',
        docker: {
          image: 'jaredly/node',
        },
      },
    },
    output: 'working git\n{{projectDir}}',
  },
}

const config = {
  silentConsole: true,
  logDest: __dirname + '/test.log',
  builders: {
    docker: require('../extra/builders/docker'),
    local: require('../extra/builders/local'),
  },
  builderConfig: {
    docker: {
    },
    local: {
      dataPath: '/tmp/fixtures-test',
    },
  },
  defaultBuilder: 'local',
  plugins: {
    // 'file-watcher': require('../extra/plugins/file-watcher'),
    'local-provider': require('../extra/plugins/local'),
    'git-provider': require('../extra/plugins/git-provider'),
    'npm-install': require('../extra/plugins/npm-install'),
    'npm-test': require('../extra/plugins/npm-test'),
    'shell-provider': require('../extra/plugins/shell-provider'),
    'shell-tester': require('../extra/plugins/shell-tester'),
    'docker-builder': require('../extra/plugins/docker-builder'),
  },
  database: {
    inMemory: true,
  },
}

;(process.env.NODOCKER ? describe.skip : describe)('fixture running', function () {
  this.timeout(30000)
  Object.keys(fixtures).forEach(name => {
    beforeEach(done => {
      const dr = config.builderConfig.local.dataPath
      rimraf(dr, err => {
        if (err) return done(err)
        mkdirp(dr, done)
      })
    })

    ;(fixtures[name].only ? it.only : it)(`fixture ${name}`, done => {
      setup(config).then(({builds, clients, dao}) => {
        const proj = fixtures[name]
        proj.name = name
        proj.id = uuid()
        proj.modified = new Date()
        return dao.putProject(proj).then(() => {
          let section = null
          let output = ''
          let runner
          let evts = []
          const sockio = fakeSock({
            default: data => {
              evts.push(data)
            },
            'build:new': ({id}) => {
              runner = clients.builds.running[id]
              evts.push(['new', runner])
            },
            'build:event': ({event}) => {
              if (event.evt === 'section') {
                section = event.val
              }
              if (event.evt === 'stream' && section === 'test') {
                output += event.val.value
              }
            },
            'build:done': ({project, build}) => {
              try {
                expect(build.status).to.eql('succeeded')
                if (proj.output) {
                  const clean = output.trim()
                    .replace(/[\u000f\u000b\f\u0000-\u0002\b\r]/g, '')
                    .replace('\n\n', '\n')
                  expect(clean)
                    .to.eql(proj.output.replace('{{projectDir}}', runner.builder.ctx.projectDir))
                }
              } catch (error) {
                console.log(project, JSON.stringify(build, null, 2))
                console.log(JSON.stringify(evts.slice(1), null, 2))
                return done(error)
              }
              done()
            }
          })
          clients.newConnection(sockio)
          sockio.sim('build:start', proj.id)
        })
      }).catch(done)
    })
  })
})

function fakeSock(eventMap) {
  const sockio = new EventEmitter()
  sockio.send = function (data) {
    data = JSON.parse(data)
    if (eventMap[data.evt]) {
      eventMap[data.evt](data.val)
    } else if (eventMap.default) {
      eventMap.default(data)
    } else {
    }
  }
  sockio.sim = function (evt, val) {
    sockio.emit('message', JSON.stringify({evt, val}))
  }
  return sockio
}

