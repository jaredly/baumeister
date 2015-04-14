
import makeViews from './views'

import Runner from './runner'
import Db from './db'
import app from './app'

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

  app(port, views).run(ready)
}

if (require.main === module) {
  run()
}

