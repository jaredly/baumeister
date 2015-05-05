
import {EventEmitter} from 'events'
import expect from 'expect.js'
import memdown from 'memdown'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import fs from 'fs'

import uuid from '../lib/uuid'
import setup from '../cli/setup'

const fixtures = {
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
  builders: {
    docker: require('../extra/builders/docker'),
    local: require('../extra/builders/local'),
  },
  builderConfig: {
    docker: {
    },
    local: {
      basePath: '/tmp/fixtures-test',
    },
  },
  defaultBuilder: 'local',
  plugins: {
    'file-watcher': require('../extra/plugins/file-watcher'),
    'local-provider': require('../extra/plugins/local'),
    'git-provider': require('../extra/plugins/git-provider'),
    'npm-install': require('../extra/plugins/npm-install'),
    'npm-test': require('../extra/plugins/npm-test'),
    'shell-provider': require('../extra/plugins/shell-provider'),
    'shell-tester': require('../extra/plugins/shell-tester'),
  },
  database: {
    inMemory: true,
  },
}

describe('fixture running', function () {
  this.timeout(10000)
  Object.keys(fixtures).forEach(name => {
    beforeEach(done => {
      const dr = config.builderConfig.local.basePath
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
          const sockio = fakeSock({
            default: data => {
              // console.log('ev', data)
            },
            'build:new': ({id}) => {
              runner = clients.builds.running[id]
              // console.log('new', runner)
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
                const clean = output.trim()
                  .replace(/[\u000f\u000b\f\u0000-\u0002\b\r]/g, '')
                  .replace('\n\n', '\n')
                expect(clean)
                  .to.eql(proj.output.replace('{{projectDir}}', runner.builder.ctx.projectDir))
              } catch (error) {
                console.log(project, JSON.stringify(build, null, 2))
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

