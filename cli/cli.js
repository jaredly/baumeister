#!/usr/bin/env babel-node

import Promise from 'bluebird'
import assign from 'object-assign'
import {EventEmitter} from 'events'
import {argv} from 'yargs'
import repl from 'repl'
import path from 'path'
import fs from 'fs'

import showEvent from './show-event'
import makeCommands from './commands'
import UsageError from './usage-error'

const conffile = argv.config || argv.c || './config'
const config = require(path.resolve(conffile))

const commands = makeCommands(config)

const pos = argv._.slice()
const cmd = pos.shift() || 'serve'

const defaults = {
  server: {
    port: process.env.PORT || 3005,
  },
  database: {
    path: process.env.DB || __dirname + '/.test.db',
  },
  builders: {},
  plugins: {},
}

for (let name in defaults) {
  if (!config[name]) {
    config[name] = defaults[name]
  } else {
    config[name] = assign(defaults[name], config[name])
  }
}

Promise.resolve()
.then(_ => {
  if (!commands[cmd]) {
    throw new UsageError(`Unknown command: ${cmd}`)
  }
  return commands[cmd](pos, argv)
})
.catch(error => {
  if (error instanceof UsageError) {
    console.log()
    console.log('! Usage error:', error.message)
    console.log()
    console.log('  Usage: cli.js serve / other things')
    console.log()
  } else {
    console.log()
    console.log('Unknown error!')
    console.log(error.message)
    console.log(error.stack)
    console.log()
  }
})

