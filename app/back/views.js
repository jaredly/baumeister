
function json(res, data, stat) {
  if (data instanceof Error) {
    console.log('err', data.message)
    console.log(data.stack)
    data = {message: data.message, stack: data.stack}
  }
  const body = JSON.stringify(data, null, 2) || ''
  res.writeHead(stat || 200, {
    'Content-type': 'application/json',
    'Content-length': body.length,
  })

  res.end(body)
}

function disp(eps) {
  return function (req, res, next) {
    const meth = req.method.toLowerCase()
    if (!eps[meth]) {
      return next()
    }
    return eps[meth](req, res, next)
  }
}

export default (builds, clients, dao) => {
  const views = {
    projects: {
      get(req, res, next) {
        const path = req.purl.pathname
        if (path === '/') {
          let p
          if (req.query.full) {
            p = dao.getProjectsWithBuilds()
          } else {
            p = dao.getProjectMap()
          }
          p.then(projects => json(res, projects))
           .catch(err => json(res, err, 500))
        } else {
          dao.getProject(path.slice(1))
            .then(project => json(res, project))
            .catch(err => json(res, err, 500))
        }
      },

      post(req, res, next) {
        const path = req.purl.pathname
        if (path === '/') {
          return dao.addProject(req.body)
            .then(project => json(res, project))
            .catch(err => json(res, err, 500))
        }
        const parts = req.url.replace(/^\//, '').replace(/\/$/, '').split('/')
        if (parts.length === 1) {
          dao.updateProject(parts[0], req.body)
            .then(project => {
              clients.emit('project:update', project)
              builds.handleProjectUpdate(parts[0], project)
              json(res, project)
            })
            .catch(err => json(res, err, 500))
        } else if (parts[1] === 'clear-cache') {
          builds.clearCache(parts[0], req.body)
            .then(_ => json(res, 'Cleared'))
            .catch(err => json(res, err, 500))
        }
      },

      delete(req, res, next) {
        const id = req.purl.pathname.slice(1)
        builds.deleteProject(id)
          .then(() => clients.emit('project:delete', id))
          .then(() => json(res, 'success'))
          .catch(err => json(res, err, 500))
      }
    },

    stopBuild: {
      post(req, res, next) {
        const path = req.purl.path
        if (path == '/') {
          next()
        }
        const parts = req.url
          .replace(/^\//, '')
          .replace(/\/$/, '').split('/')
        if (parts.length !== 3) {
          return next()
        }
        if (parts[2] !== 'interrupt') {
          return next()
        }
      }
    },

    config: {
      get(req, res, next) {
        dao.getConfig()
          .then(config => json(res, config))
          .catch(err => json(res, err, 500))
      },

      post(req, res, next) {
        dao.setConfig(req.body)
          // TODO publish config change to attached clients?
          .then(config => {
            clients.handleConfigChange(req.body)
            json(res, config)
          })
          .catch(err => json(res, err, 500))
      },
    },

    builds: {
      get(req, res, next) {
        if (req.url === '/') {
          dao.getBuilds()
            .then(builds => json(res, builds))
            .catch(err => json(res, err, 500))
          return
        }
        const parts = req.url.replace(/^\//, '').replace(/\/$/, '').split('/')
        if (parts.length === 1) {
          dao.getBuilds(parts[0])
            .then(builds => json(res, builds))
            .catch(err => json(res, err, 500))
        } else if (parts.length === 2) {
          dao.getBuild(parts[0], parts[1])
            .then(build => {
              if (!build) return json(res, null, 404)
              json(res, build)
            })
            .catch(err => json(res, err, 500))
        } else if (parts.length === 3) {
          const action = parts[2]

          if (action === 'interrupt') {
            return builds.stopBuild(parts[1])
              .then(_ => json(res, 'Ok'))
              .catch(err => json(res, err, 500))
          } else {
            next()
          }
        } else {
          next()
        }
      },

      post(req, res, next) {
        const path = req.purl.path
        if (path == '/') {
          next()
        }
        const parts = req.url.replace(/^\//, '').replace(/\/$/, '').split('/')
        if (parts.length === 3 && parts[2] === 'interrupt') {
          return builds.stopBuild(parts[1])
            .then(_ => json(res, 'Ok'))
            .catch(err => json(res, err, 500))
        }
        if (parts.length !== 1) {
          return json(res, new Error('invalid'), 500)
        }
        builds.startBuild(parts[0])
          .then(id => json(res, id))
          .catch(err => json(res, err, 500))
      },

      delete(req, res, next) {
        if (req.url) return json(res, 'not found', 404)
        dao.deleteBuild(req.url.slice(1))
          .then(() => json(res, 'ok'))
          .catch(err => json(res, err, 500))
      }
    }
  }

  for (let name in views) {
    if ('function' !== typeof views[name]) {
      views[name] = disp(views[name])
    }
  }
  return views
}
