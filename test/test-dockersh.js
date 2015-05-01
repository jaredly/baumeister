
import psome from './psome'
import Promise from 'bluebird'
import Docksh from './docksh'
import Docker from 'dockerode'

const docker = new Docker()
const docksh = new Docksh(docker, {
  image: 'ubuntu',
  path: '/home/jared/clone/ci/.builds'
})

docksh.init().then(_ => {
  console.log('ready')
  psome([
    docksh.run('echo "some things";sleep 2;echo "after things"', {
      emit(ev, val) {
        if (ev === 'stream') console.log(val.value)
        console.log('[emit]', '[' + ev + ']', val)
      }
    }),
    docksh.run('echo "one";sleep 1;echo "hello world"; fail', {
      emit(ev, val) {
        if (ev === 'stream') console.log(val.value)
        console.log('[emit]', '[' + ev + ']', val)
      }
    }),
  ]).then(results => {
    results.forEach(res => {
      if (res.error) {
        console.log('Error', res.error)
      } else {
        console.log('Success', res.value)
      }
    })
    docksh.stopAndRemove().then(_ => console.log('remved!'))
  })
})

