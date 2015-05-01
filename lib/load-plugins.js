
export default function loadPlugins(manager, app, config, done) {
  const pnames = Object.keys(plugins)
  const plugs = {}
  pnames.forEach(name => {
    plugs[name] = new plugins[name](manager, app)
  })

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

}

