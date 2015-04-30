
import {Store, Actions} from 'flummox'
import {List, Map} from 'immutable'

function getNotifications() {
  // Let's check if the browser supports notifications
  if (!("Notification" in window)) {
    return console.warn("This browser does not support desktop notification");
  }

  if (Notification.permission === "granted") {
    return
  }

  if (Notification.permission !== 'denied') {
    Notification.requestPermission()
  }
}

class ConfigActions extends Actions {
  constructor(api) {
    super()
    this.api = api
  }

  save(config) {
    return this.api.saveConfig(config)
  }

  fetch() {
    return this.api.fetchConfig()
  }
}

class ConfigStore extends Store {
  constructor(flux) {
    super()
    const ids = flux.getActionIds('config')
    this.register(ids.save, this.onSave)
    this.register(ids.fetch, this.onFetch)
    this.state = {config: null}
    flux.getActions('config').fetch()
  }

  getConfig() {
    return this.state.config
  }

  onFetch(config) {
    this.setState({config})
  }

  onSave(config) {
    this.setState({config})
    if (config.notifications !== 'none') {
      getNotifications()
    }
    // TODO handle notification stuff here
  }
}

export {ConfigActions, ConfigStore}


