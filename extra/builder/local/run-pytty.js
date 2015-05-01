
import {spawn} from 'child_process'

import {ShellError} from './errors'

function runPyTTY(cmd, spawnOptions, options, io) {
  const sid = uuid()
  const start = Date.now()
  if (!options.silent) {
    io.emit('stream-start', {
      id: sid, 
      time: start,
      cmd: cmd
    })
  }

  let resolved = false
  let childProcess
  let promResolver
  function onInterrupt(done) {
    if (resolved) return // control has been passed off
    promResolver(new InterruptError())
    if (childProcess) {
      childProcess.kill()
    }
    resolved = true
  }
  io.on('interrupt', onInterrupt)

  return prom(_done => {
    const done = function () {
      if (resolved) return console.warn('runPyTTY > already resolved')
      resolved = true
      io.off('interrupt', onInterrupt)
      return _done.apply(this, arguments)
    }
    promResolver = done

    var child = spawn('python3', [__dirname + '/runtty.py', cmd], {
      cwd: options.cwd,
      env: options.env,
    })
    childProcess = child

    child.stdout.on('data', function (data) {
      io.emit('stream', {
        id: sid,
        value: data.toString('utf8'),
        time: Date.now(),
      })
    })

    child.stderr.on('data', function (data) {
      io.emit('stream', {
        id: sid,
        value: data.toString('utf8'),
        time: Date.now(),
      })
    })

    child.on('exit', function (code, signal) {
      const end = Date.now()
      const dur = end - start
      if (code != 0) {
        io.emit('stream-end', {
          id: sid,
          time: end,
          duration: dur,
          error: "non-zero exit code: " + code
          exitCode: code
        })
        return done(new ShellError(cmd, code))
      }
      io.emit('stream-end', {
        id: sid,
        time: end,
        duration: dur,
      })
      done(null, data.ExitCode)
    })
  })
}
