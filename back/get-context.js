
import tar from 'tar-stream'
import tarfs from 'tar-fs'
import path from 'path'
import fs from 'fs'

import ConfigError from './config-error'

export default function getContext(project, done) {
  const name = project.build.dockerfile || 'Dockerfile'
  const fpath = path.join(project.source.path, name)
  fs.readFile(fpath, (err, data) => {
    if (err) {
      console.log('Failed to get dockerfile', err)
      return done(new ConfigError(`Dockerfile ${fpath} not found!`))
    }
    const dockerText = data.toString()
    if (project.build.context === true) {
      return done(null, tarfs.pack(project.source.path), dockerText)
    }
    let pack
    if (project.build.context === false) {
      pack = tar.pack()
    } else {
      pack = tarfs.pack(path.join(project.source.path, project.build.context))
    }
    pack.entry({name}, dockerText)
    pack.finalize()
    return done(null, pack, dockerText)
  })
}

