
import tar from 'tar-stream'
import tarfs from 'tar-fs'
import fs from 'fs'
import path from 'path'

export default function getContext(project, done) {
  const name = project.build.dockerfile || 'Dockerfile'
  const fpath = path.join(project.source.path, name)
  fs.readFile(fpath, (err, data) => {
    if (err) {
      return done(new Error(`Dockerfile ${fpath} not found!`))
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

