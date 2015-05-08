
import {EventEmitter} from 'events'
import expect from 'expect.js'
import memdown from 'memdown'
import mkdirp from 'mkdirp'
import rimraf from 'rimraf'
import fs from 'fs'

import uuid from '../lib/uuid'
import setup from '../cli/setup'


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


describe('plugins', () => {
  let plugins, clients, dao
  beforeEach(done => {
    setup(config).then(data => {
      plugins = data.plugins
      clients = data.clients
      dao = data.dao
      done()
    })
  })

  it("should run a plugin's 'onProject' for current projects when a new plugin is added", done => {
    dao.putProject({
      name: 'hello',
      plugins: {
        example: {}
      }
    }).then(() => {
      plugins.addPlugins({
        example: {
          onProject(project, config) {
            expect(project.name).to.equal('hello')
            done()
          }
        }
      })
    })
  })

  it("plugins.handleProjectUpdate should run newly configured plugins' 'onProject' when a project is reconfigured", done => {
    dao.addProject({
      name: 'hello',
      plugins: { }
    }).then(project => {
      plugins.addPlugins({
        example: {
          onProject(project, config) {
            expect(project.name).to.equal('hello')
            done()
          }
        }
      })

      plugins.handleProjectUpdate(project.id, {
        id: project.id,
        name: project.name,
        plugins: {
          example: {}
        }
      })
    })
  })

})

