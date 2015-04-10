
import Runner from './runner'
import EventEmitter from 'eventemitter3'
import es from 'event-stream'
import config from './notablemind.config.js'

const r = new Runner()

r.on('status', val => console.log('[status]', val))
r.on('info', val => console.log('[info]', val))
r.on('stream', val => {
  if (val.end) {
    console.log(`[stream ${val.stream}] <end> ${val.error ? val.error.error : ''}`)
  } else {
    console.log(`[stream ${val.stream}]`, val.value.trim())
  }
})

r.run(config, (err, res) => {
  if (err) {
    console.log('Err!', err)
  }
  console.log('Done with everything!')
})

