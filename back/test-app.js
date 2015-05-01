
import makeViews from './views'

import memdown from 'memdown'

import plugins from '../plugins'
import Manager from './manager'
import setupApp from './app'
import Db from './db'

const spec = {
  builds: ['project', 'num', 'status'],
  projects: ['name', 'modified'],
  config: [],
}

const db = new Db(__dirname + '/.test.db', spec)//, memdown)

import uuid from './uuid'

const manager = new Manager(db, __dirname + '/../.builds')

manager.init().then(_ => {
  const views = makeViews(manager)

  const app = setupApp(3005, views, manager)

  const pnames = Object.keys(plugins)
  const plugs = {}
  pnames.forEach(name => {
    plugs[name] = new plugins[name](manager, app)
  })
  console.log(plugins)

  manager.db.all('projects').then(projects =>
                             projects.forEach(project =>
                                              pnames.forEach(name => {
    console.log(project.id, project.plugins)
    if (!project.plugins || !project.plugins[name]) return
    plugs[name].onProject(project, project.plugins[name])
  })))
  .then(() => console.log('plugins initialized'))
  .catch(err => console.error('Failed to get projects for plugins', err))
  manager.plugins = plugs

  app.run(server => {
    console.log('ready')
  })
})

