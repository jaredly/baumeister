
import React from 'react';
import Router from 'react-router'
import FluxComponent from 'flummox/component'

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
flux.addStore('config', {
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

flux.addStore('projects', {
  projects: {
    fetch(data, update) {
      update({$set: data})
    }
  }
})
flux.addActions('projects', {
  fetch: api.getProjects.bind(api),
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
})

