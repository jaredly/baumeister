
const showEvent = {
  'build:new': val => console.log(`# Build created ${val.id}`),
  'build:update': val => {
    if (val.status === 'running') return
    if (val.status === 'succeeded') {
      return console.log(`#### Build Passed! ####`)
    }
    if (val.status === 'errored') {
      console.log()
      console.log(`!!!! Build Errored (${val.errorCause}) !!!!`)
      console.log()
      if (val.errorCause === 'server') {
        console.log(val.error.message)
        console.log(val.error.stack)
      } else if (val.errorCause === 'shell-exit') {
        console.log(`$ ${val.error.cmd} (exit code ${val.error.exitCode})`)
      } else {
        console.log(JSON.stringify(val.error, null, 2))
      }
    }
    if (val.status === 'failed') {
      console.log()
      console.log(`:( :( :( Build Failed (${val.errorCause}) ): ): ):`)
      console.log()
      if (val.errorCause === 'shell-exit') {
        console.log(`$ ${val.error.cmd} (exit code ${val.error.exitCode})`)
      } else {
        console.log(JSON.stringify(val.error, null, 2))
      }
      console.log()
    }
  },
  'build:status': () => null,
  'build:done': () => console.log('Finished build'),
  'build:event': val => {
    const type = val.event.evt
    val = val.event.val
    if (type === 'stream-start') {
      console.log()
      console.log(`>> $ ${val.cmd || val.title}`)
      console.log()
    } else if (type === 'stream') {
      process.stdout.write(val.value)
    } else if (type === 'stream-end') {
      console.log()
      console.log('<<')
      console.log()
    } else if (type === 'section') {
      console.log()
      console.log(`[[[[    ${val}    ]]]]`)
      console.log()
    } else if (type === 'info') {
      console.log('{info}', val)
    } else {
      console.log(`[${type}]`, val)
    }
  }
}

export default showEvent

