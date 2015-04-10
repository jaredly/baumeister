
import http from 'http'

import connect from 'connect'
import serveStatic from 'serve-static'
import compression from 'compression'
import bodyParser from 'body-parser'
import cors from 'cors'

import makeViews from './views'

import Runner from './runner'
import Db from './db'

export default run

const SPEC = {
  builds: ['project', 'num'],
  projects: ['name'],
}

function run(port, ready) {
  if (arguments.length < 2) {
    ready = port
    port = process.env.PORT || 3000
  }
  if (!ready) {
    ready = () => {
      console.log('ready', port)
    }
  }

  const db = new Db(__dirname + '/db.db', SPEC)
  const runner = new Runner(db)
  const views = makeViews(runner)

  const app = connect()
  app.use(cors())
  app.use(compression())
  app.use(bodyParser.json({limit: '5mb'}))

  app.use('/api/builds', views.builds)
  app.use('/api/projects', views.projects)

  /*
  app.use('/components/', views.component)
  app.use('/docs/', views.docs)
  app.use('/build',
          serveStatic(__dirname + '/build'))
  app.use('/app',
          serveStatic(__dirname + '/../www'))
  app.use('/vendor',
          serveStatic(__dirname + '/../www/vendor'))
  */

  const server = http.createServer(app)
  server.listen(port, ready.bind(null, server))
}

if (require.main === module) {
  run()
}

