
import http from 'http'

import connect from 'connect'
import serveStatic from 'serve-static'
import compression from 'compression'
import bodyParser from 'body-parser'
import cors from 'cors'
import url from 'url'
import qs from 'querystring'
import express from 'express'

function urlify(req, res, next) {
  req.purl = url.parse(req.url)
  req.query = qs.parse(req.purl.query)
  next()
}

export default function makeApp(port, views, clients) {

  const app = express()
  app.use(cors())
  app.use(compression())
  app.use(bodyParser.json({limit: '5mb'}))

  app.use('/api/builds', urlify)
  app.use('/api/builds', views.builds)
  app.use('/api/config', views.config)
  app.use('/api/projects', urlify)
  app.use('/api/projects', views.projects)

  app.run = function (ready) {
    const server = http.createServer(app)
    const WebSocketServer = require('ws').Server
    const wss = new WebSocketServer({ server });
    wss.on('connection', socket => {
      clients.newConnection(socket)
    })
    server.listen(port, ready.bind(null, server))
  }

  return app
}

