
import React from 'react';
import Router from 'react-router'
import RCSS from 'rcss'
import aggEvents from '../lib/agg-events'

import routes from './routes';
import CiFlux from './stores'
import Api from './api'

import {Flux} from 'flammable/react'

const router = Router.create({
  routes,
  scrollBehavior: {
    updateScrollPosition: function () {}
  }
})

const api = new Api('localhost:3005')
const flux = new Flux()
window.flux = flux

/** websocket stuff **/

const wsActions = {
  'config:update': true,
  'build:new': true,
  'build:status': true,
  'project:update': true,
  'build:update': true,
  'build:event': true,
  'build:history': true,
  'ws:state': true,
}

flux.addActions('ws', wsActions)
Object.keys(wsActions).forEach(name => {
  api.on(name, val => flux.sendAction('ws.' + name, val))
})

flux.addStore('ws', {state: 'connecting'}, {
  ws: {
    ['ws:state'](val, update) {
      update({state: {$set: val}})
    }
  }
})


flux.addStore('config', {
  ws: {
    'config:update': (config, update) => {
      update({$set: config})
    },
  },
  config: {
    fetch(config, update) {
      update({$set: config})
    },
    save(config, update) {
      update({$set: config})
    }
  }
})
flux.addActions('config', {
  save(config) {
    return api.saveConfig(config)
  },
  fetch() {
    return api.fetchConfig()
  }
})

flux.addStore('projects$status', {
  projects: {
    clearCache: {
      start(tid, [id], update, state) {
        if (!state[id]) {
          return update({[id]: {$set: {
            clearCache: {
              [tid]: true,
              latest: {tid, value: true},
            }
          }}})
        }
        update({[id]: {
          clearCache: {
            [tid]: {$set: true},
            latest: {$set: {tid, value: true}},
          }
        }})
      },

      error(tid, {args: [id], err}, update, state) {
        if (state[id].clearCache.latest.tid !== tid) {
          return update({[id]: {
            clearCache: {[tid]: {$set: err}}
          }})
        }
        update({[id]: {
          clearCache: {
            [tid]: {$set: err},
            latest: {value: {$set: err}}
          }
        }})
      },

      done(tid, {args: [id]}, update, state) {
        if (state[id].clearCache.latest.tid !== tid) {
          return update({[id]: {
            clearCache: {[tid]: {$set: null}}
          }})
        }
        update({[id]: {
          clearCache: {
            [tid]: {$set: null},
            latest: {value: {$set: null}}
          }
        }})
      },
    },
  }
})

flux.addStore('projects', {
  projects: {
    fetch(data, update) {
      update({$set: data})
    },
    clearCache: {
      start(tid, [pid], update, state) {
        update({[pid]: {cache: {$set: 'clearing'}}})
      },
      error(tid, {args: [pid], err}, update) {
        console.warn('failed to clear cache', pid, err)
        update({[pid]: {cache: {$set: 'failed'}}})
      },
      result(tid, pid, update) {
        update({[pid]: {cache: {$set: 'cleared'}}})
      },
    },
  },

  ws: {
    'build:history': ({project, id}, update, state) => {
      if (!state[project] || state[project].latestBuild.id !== id) return
      update({
        [project]: {
          latestBuild: {
            status: {$set: 'running'},
          }
        }
      })
    },
    'project:update': (project, update, state) => {
      if ('string' === typeof project.latestBuild) {
        project.latestBuild = state[project.id].latestBuild
      }
      update({
        [project.id]: {$set: project}
      })
    },
    'build:new': (build, update, state) => {
      if (!state[build.project]) return
      update({
        [build.project]: {
          latestBuild: {$set: build}
        }
      })
    },
    'build:status': (data, update, state) => {
      const {project, build, status, duration} = data
      const proj = state[project]
      if (!proj || proj.latestBuild.id !== build) return
      update({
        [project]: {
          latestBuild: {
            status: {$set: status},
            duration: {$set: duration},
          }
        }
      })
    },
  },
})

flux.addActions('projects', {
  fetch: api.getProjects.bind(api),
  update: api.updateProject.bind(api),
  startBuild: api.startBuild.bind(api),
  clearCache: api.clearCache.bind(api),
  create: api.newProject.bind(api),
})

flux.addStore('builds', {
  ws: {
    'build:new': (build, update, state) => {
      if (!state[build.project]) {
        return update({
          [build.project]: {$set: [build]}
        })
      }
      update({
        [build.project]: {$unshift: [build]}
      })
    },
    'build:update': (build, update, state) => {
      let ix = -1
      let builds = state[build.project]
      for (let i=0; i<builds.length; i++) {
        if (builds[i].id === build.id) {
          ix = i; break
        }
      }
      if (ix === -1) {
        return console.warn('got update for unknown build')
      }
      update({
        [build.project]: {
          [ix]: {$set: build}
        }
      })
    },
    'build:event': ({project, build, event}, update, state) => {
      let ix = -1
      let builds = state[project]
      for (let i=0; i<builds.length; i++) {
        if (builds[i].id === build) {
          ix = i; break
        }
      }
      if (ix === -1) {
        return console.warn('got event for unknown build')
      }
      update({
        [project]: {
          [ix]: {
            events: {
              $set: aggEvents([event], builds[ix].events)
            }
          }
        }
      })
    },
    'build:history': ({id, project, events}, update, state) => {
      let ix = -1
      let builds = state[project]
      for (let i=0; i<builds.length; i++) {
        if (builds[i].id === id) {
          ix = i; break
        }
      }
      if (ix === -1) {
        return console.warn('got history for unknown build')
      }
      update({
        [project]: {
          [ix]: {
            events: {$set: events}
          }
        }
      })
    }
  },
  builds: {
    fetch({projectId, builds}, update) {
      update({
        [projectId]: {$set: builds}
      })
    }
  },
})
flux.addActions('builds', {
  fetch: projectId => api.getBuilds(projectId)
    .then(builds => ({projectId, builds})),
  setOpen(id) {
    api.send('build:view', id)
  },
  stop(projectId, buildId) {
    api.stopBuild(projectId, buildId)
  }
})



/*
    let focused = true
    window.addEventListener('focus', () => focused = true)
    window.addEventListener('blur', () => focused = false)
    props.api.on('build:done', data => {
      if (focused) return
      if (this.props.config.notifications === 'all' ||
         (this.props.config.Notifications === 'failures' && data.build.status === 'failed')) {
        const title = `Build ${data.build.num} for ${data.project.name} ${data.build.status}`
        const body = `Took ${mmSS(data.build.duration)}`
        const note = new Notification(title, {
          body,
          icon: `/static/icon-${data.build.status}.png`
        })
        setTimeout(_ => note.close(), 5000)
      }
    })

    props.api.on('ws:state', state => {
      this.setState({
        connState: state,
      })
    })

   setState({connState: this.props.api.state}
*/

router.run(Handler => {
  React.render(flux.wrap(<Handler/>), document.getElementById('root'));
  RCSS.injectAll()
})


