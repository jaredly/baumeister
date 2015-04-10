
import Runner from './runner'
import EventEmitter from 'eventemitter3'
import es from 'event-stream'

const out = new EventEmitter()

out.on('status', val => console.log('[status]', val))
out.on('info', val => console.log('[info]', val))
out.on('stream', val => {
  if (val.end) {
    console.log(`[stream ${val.stream}] <end> ${val.error ? val.error.error : ''}`)
  } else {
    console.log(`[stream ${val.stream}]`, val.value.trim())
  }
})

const r = new Runner()

r.run({
  name: 'itreed',
  modified: new Date(),
  source: {
    path: '/home/jared/clone/nm/itreed/'
  }, 
  build: {
    // prefab: 'google/nodejs:latest',
    dockerfile: 'Docker.ci',
    context: false,
  },
  test: {
    cmd: 'make test',
  }
}, out, (err, res) => {
  console.log('Err!', err)
  console.log('res', res)
})

