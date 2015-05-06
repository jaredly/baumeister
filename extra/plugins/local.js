
import prom from '../../lib/prom'
import {ConfigError} from '../../lib/errors'

import fs from 'fs'

class Local {
  constructor(manager, app) {
    //
  }

  onBuild(project, build, onStep, config) {
    onStep('init', (builder, ctx, io) => {
      if (config.inPlace) {
        if (builder.type === 'docker') {
          ctx.projectContainer = null
          ctx.projectBind = config.path
        } else if (builder.type === 'local') {
          ctx.projectDir = config.path
        }
      } else {
        if (builder.type === 'docker') {
          ctx.runnerConfig.binds.push(`${config.path}:/localProject:rw`)
        }
      }
      return prom(done => {
        fs.exists(config.path, exists => {
          if (exists) return done()
          done(new ConfigError(`No such path ${config.path}`, 'local-builder.path'))
        })
      })
    })

    onStep('getproject', (builder, ctx, io) => {
      if (config.inPlace) {
        return io.emit('info', `Using ${config.path} in place`)
      }
      if (builder.type === 'docker') {
        return builder.run(`cp -RT /localProject /project`)
      }
      return builder.run(`cp -RT ${config.path} ${ctx.projectDir}`)
    })
  }
}

export default {
  sort: 0,
  title: 'Local Provider',
  id: 'awesome',
  plugin: Local,
  buildTypes: ['docker', 'local'],
  globalConfig: null,
  projectConfig: {
    schema: {
      path: {
        type: 'text',
        title: 'Path to the project on your machine',
        default: '/some/path',
      },
      inPlace: {
        type: 'checkbox',
        title: "Use in place (don't copy to an isolated environment)",
        default: false,
      },
    },
  },
}

