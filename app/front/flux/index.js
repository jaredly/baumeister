
import {Flux} from 'flammable/react'

import Api from '../api'
import mmSS from '../lib/mmSS'

import {projectStore, projectStatus} from './projects'
import {buildStore} from './builds'

export default function setupFlux(config) {
  const api = new Api(config.apiHost || 'localhost:3005')

  const flux = new Flux()
  window.flux = flux

  /** websocket stuff **/

  const wsActions = {
    'config:update': true,
    'build:new': true,
    'build:status': true,
    'project:update': true,
    'project:remove': true,
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

  flux.addStore('projects$status', {_status: 'unloaded'}, projectStatus)
  flux.addStore('projects', projectStore)

  flux.addActions('projects', apiActions(api, {
    fetch: 'getProjects',
    update: 'updateProject',
    startBuild: 'startBuild',
    clearCache: 'clearCache',
    create: 'newProject',
    remove: 'removeProject',
  }))

  flux.addStore('builds', buildStore)

  flux.addActions('builds', {
    fetch: projectId => api.getBuilds(projectId)
            .then(builds => ({projectId, builds})),
    setOpen(id) {
      api.send('build:view', id)
    },
    getHistory(id) {
      api.send('build:get-history', id)
    },
    stop(projectId, buildId) {
      api.stopBuild(projectId, buildId)
    }
  })

  setupNotifications(api, flux)

  flux.sendAction('config.fetch')

  return flux
}

function apiActions(api, obj) {
  let res = {}
  for (let name in obj) {
    res[name] = api[obj[name]].bind(api)
  }
  return res
}

function setupNotifications(api, flux) {
  if (!window.Notification) return console.warn('Notifications not supported')
  let focused = true
  window.addEventListener('focus', () => focused = true)
  window.addEventListener('blur', () => focused = false)

  function checkPermissions(config) {
    if (config.notifications === 'none') return
    if (Notification.permission === 'granted') return
    Notification.requestPermission()
  }

  // flux.onStore(['config'], checkPermissions)
  flux.onAction('config', 'save', checkPermissions)
  flux.onAction('config', 'fetch', checkPermissions)
  flux.onAction('ws', 'config:update', checkPermissions)

  api.on('build:done', data => {
    if (focused) return // don't show if you're looking at the page
    let setting = flux.stores.config.notifications
    if (setting === 'none') return
    if (setting === 'failures' && data.build.status !== 'failed') return

    const title = `Build ${data.build.num} for ${data.project.name} ${data.build.status}`
    const body = `Took ${mmSS(data.build.duration)}`
    const note = new Notification(title, {
      body,
      icon: `/icon-${data.build.status}.png`
    })
    setTimeout(_ => note.close(), 5000)
  })
}

