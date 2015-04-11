
import Runner from './runner'
import config from './loco.config.js'

const r = new Runner(config, __dirname + '/../.builds')

r.on('status', val => console.log('[status]', val))
r.on('info', val => console.log('[info]', val))
r.on('stream', val => {
  if (val.end) {
    console.log(`[stream ${val.stream}] <end> ${val.error ? val.error.error : ''}`)
  } else {
    console.log(`[stream ${val.stream}]`, val.value.trim())
  }
})

r.run((err, res) => {
  if (err) {
    console.log('Err!', err)
  }
  console.log('Done with everything!')
})

