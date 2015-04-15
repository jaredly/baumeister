
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

export default manager => {
  const views = {
    projects: {
      get(req, res, next) {
        const path = req.purl.pathname
        if (path === '/') {
          let p
          if (req.query.full) {
            p = manager.getProjectsWithBuilds()
          } else {
            p = manager.getProjects()
          }
          p.then(projects => json(res, projects))
           .catch(err => json(res, err, 500))
        } else {
          manager.getProject(path.slice(1))
            .then(project => json(res, project))
            .catch(err => json(res, err, 500))
        }
      },

      post(req, res, next) {
        const path = req.purl.pathname
        if (path === '/') {
          manager.addProject(req.body)
            .then(project => json(res, project))
            .catch(err => json(res, err, 500))
        } else {
          manager.updateProject(path.slice(1), req.body)
            .then(project => json(res, project))
            .catch(err => json(res, err, 500))
        }
      },

      delete(req, res, next) {
        manager.deleteProject(req.url.strip(1))
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
          // return json(res, new Error('invalid'), 500)
          return next()
        }
        if (parts[2] !== 'interrupt') {
          return next()
        }
      }
    },

    config: {
      get(req, res, next) {
        manager.getConfig()
          .then(config => json(res, config))
          .catch(err => json(res, err, 500))
      },

      post(req, res, next) {
        manager.setConfig(req.body)
          .then(config => json(res, config))
          .catch(err => json(res, err, 500))
      },
    },

    builds: {
      get(req, res, next) {
        if (req.url === '/') {
          manager.getBuilds()
            .then(builds => json(res, builds))
            .catch(err => json(res, err, 500))
          return
        }
        const parts = req.url.replace(/^\//, '').replace(/\/$/, '').split('/')
        if (parts.length === 1) {
          manager.getBuilds(parts[0])
            .then(builds => json(res, builds))
            .catch(err => json(res, err, 500))
        } else if (parts.length === 2) {
          manager.getBuild(parts[0], parts[1])
            .then(build => {
              if (!build) return json(res, null, 404)
              json(res, build)
            })
            .catch(err => json(res, err, 500))
        } else if (parts.length === 3 && parts[2] === 'interrupt') {
          return manager.stopBuild(parts[1])
            .then(_ => json(res, 'Ok'))
            .catch(err => json(res, err, 500))
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
          return manager.stopBuild(parts[1])
            .then(_ => json(res, 'Ok'))
            .catch(err => json(res, err, 500))
        }
        if (parts.length !== 1) {
          return json(res, new Error('invalid'), 500)
        }
        manager.startBuild(parts[0])
          .then(id => json(res, id))
          .catch(err => json(res, err, 500))
      },

      delete(req, res, next) {
        if (req.url) return json(res, 'not found', 404)
        manager.deleteBuild(req.url.slice(1))
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
