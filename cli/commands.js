
import setup from './setup'
import UsageError from './usage-error'

const commands = config => ({
  serve(pos, argv) {
    return setup(config)
      .then(({app, builds, clients, dao}) => app.run(server => {
        builds.logger.info('ready')
      }))
  },
  repl(pos, argv) {
    return setup(config)
      .then(({builds, clients, dao}) => {
        global.builds = builds
        global.clients = clients
        global.dao = dao
        console.log('### Jaeger repl! ###')
        console.log('--- available variables: ---')
        console.log('- builds: BuildManager')
        console.log('- clients: ClientManager')
        console.log('- dao: Dao')
        repl.start({useGlobal: true})
      })
  },
  initdb(pos, argv) {
    return setup(config)
      .then(({builds, clients, dao}) => {
        return loadDefaultProjects(pos, argv, dao)
      })
  },
  build(pos, argv) {
    return setup(config)
      .then(({builds, clients, dao}) => {
        const project = pos.shift()
        if (!project) throw new UsageError('Project id / file required')
        return Promise.resolve().then(_ => {
          if (!fs.existsSync(path.resolve(project))) {
            return project
          }
          let data
          try {
            data = require(path.resolve(project))
          } catch (err) {
            throw new UsageError(`Failed to require file: ${project}`)
          }
          if (!data.id) data.id = uuid()
          return dao.putProject(data)
            .then(_ => data.name)
        }).then(projectId => {
          const sockio = new EventEmitter()
          sockio.send = function (data) {
            data = JSON.parse(data)
            if (showEvent[data.evt]) {
              showEvent[data.evt](data.val)
            } else {
              console.log(`[${data.evt}]`, JSON.stringify(data.val, null, 2))
            }
            if (data.evt === 'build:new') {
              sockio.emit('message', JSON.stringify({
                evt: 'build:view',
                val: data.val.id,
              }))
            }
            if (data.evt === 'build:done') {
              console.log('Done!')
              process.exit()
            }
          }
          clients.newConnection(sockio)
          sockio.emit('message', JSON.stringify({
            evt: 'build:start',
            val: projectId
          }))
      })
    })
  },
})

export default commands


import uuid from '../lib/uuid'

function loadDefaultProjects(pos, argv, dao) {
  const projects = [
    require('../test/fixtures/loco.config.js'),
    require('../test/fixtures/itreed-js.config.js'),
    require('../test/fixtures/passes.config.js'),
    require('../test/fixtures/notablemind.config.js'),
    require('../test/fixtures/jaeger.config.js'),
    require('../test/fixtures/test.config.js'),
  ]
  projects.forEach(proj => {
    proj.id = uuid()
    proj.status = 'inactive'
  })
  return dao.getProjects().then(currents => {
    if (currents.length) {
      if (!(argv.f || argv.force)) {
        throw new UsageError('DB not empty! (-f to replace db)')
      }
      console.log('Deleting current projects')
      return Promise.all(currents.map(proj =>
                                      dao.deleteProject(proj.id)))
    }
  }).then(() => {
    return Promise.all(projects.map(proj => dao.addProject(proj)))
  })
}

