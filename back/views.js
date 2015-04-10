
function json(res, data, stat) {
  if (data instanceof Error) {
    console.log('err', data.message)
    console.log(data.stack)
    data = {message: data.message, stack: data.stack}
  }
  const body = JSON.stringify(data)
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

export default runner => {
  const views = {
    projects: {
      get(req, res, next) {
        if (req.url === '/') {
          runner.getProjects()
            .then(projects => json(res, projects))
            .catch(err => json(res, err, 500))
        } else {
          runner.getProject(req.url.slice(1))
            .then(project => json(res, project))
            .catch(err => json(res, err, 500))
        }
      },

      post(req, res, next) {
        runner.addProject(req.body)
          .then(project => json(res, project))
          .catch(err => json(res, err, 500))
      },

      delete(req, res, next) {
        runner.deleteProject(req.url.strip(1))
          .then(() => json(res, 'success'))
          .catch(err => json(res, err, 500))
      }
    },

    builds: {
      get(req, res, next) {
        if (req.url === '/') {
          return next()
        }
        const parts = req.url.replace(/^\//, '').replace(/\/$/, '').split('/')
        if (parts.length === 1) {
          runner.getBuilds(req.url.slice(1))
            .then(builds => json(res, builds))
            .catch(err => json(res, err, 500))
        } else if (parts.length === 2) {
          runner.getBuild(parts[0], parts[1])
            .then(build => {
              if (!build) return json(res, null, 404)
              json(res, build)
            })
            .catch(err => json(res, err, 500))
        }
      },

      post(req, res, next) {
        json(res, new Error('not implemented'), 500)
      },

      delete(req, res, next) {
        if (req.url) return json(res, 'not found', 404)
        runner.deleteBuild(req.url.slice(1))
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
