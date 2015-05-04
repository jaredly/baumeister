
import {spawn} from 'child_process'

import {ShellError, InterruptError} from '../../../lib/errors'
import uuid from '../../../lib/uuid'
import prom from '../../../lib/prom'

export default function runPyTTY(cmd, spawnOptions, options, io) {
  const sid = uuid()
  const start = Date.now()
  if (!options.silent) {
    io.emit('stream-start', {
      id: sid, 
      time: start,
      cmd: cmd,
      plugin: options.plugin,
      cleanCmd: options.cleanCmd,
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
      cwd: spawnOptions.cwd,
      env: spawnOptions.env,
    })
    childProcess = child

    if (!options.silent) {
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
    }

    child.on('exit', function (code, signal) {
      const end = Date.now()
      const dur = end - start
      if (code != 0 && !options.badExitOK) {
        if (!options.silent) {
          io.emit('stream-end', {
            id: sid,
            time: end,
            duration: dur,
            error: "non-zero exit code: " + code,
            exitCode: code
          })
        }
        return done(new ShellError(cmd, code))
      }
      if (!options.silent) {
        io.emit('stream-end', {
          id: sid,
          time: end,
          duration: dur,
        })
      }
      done(null, options.badExitOK ? {code} : code)
    })
  })
}
