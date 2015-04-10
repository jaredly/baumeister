
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

export default runner => {
  const views = {
    builds(req, res, next) {
      if (req.method === 'GET') {
        return views.getBuilds(req, res, next)
      }
      if (req.method === 'POST') {
        return views.startBuild(req, res, next)
      }
      if (req.method === 'DELETE') {
        return views.removeBuild(req, res, next)
      }
    },

    getBuilds(req, res, next) {
      if (req.url === '/') {
        return next()
      }
      runner.getBuilds(req.url.slice(1))
        .then(builds => json(res, builds))
        .catch(err => json(res, err, 500))
    },

    startBuild(req, res, next) {
    },

    removeBuilds(req, res, next) {
    }
  }
  return views
}
