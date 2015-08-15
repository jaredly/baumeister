
import aggEvents from '../../../lib/agg-events'

export const buildStore = {
  ws: {
    'build:new': (store, build) => {
      if (!store.state[build.project]) {
        return store.update({
          [build.project]: {$set: {[build.id]: build}}
        })
      }
      store.update({
        [build.project]: {
          [build.id]: {$set: build}
        }
      })
    },

    'build:update': (store, build) => {
      store.update({
        [build.project]: {
          [build.id]: {$set: build}
        }
      })
    },

    'build:event': (store, {project, build, event}) => {
      if (!store.state[project][build]) {
        store.sendAction('builds.getHistory', build)
        return console.warn('got event for unknown build')
      }
      store.update({
        [project]: {
          [build]: {
            events: {
              $set: aggEvents([event], store.state[project][build].events)
            }
          }
        }
      })
    },

    'build:history': (store, {id, project, events}) => {
      if (!store.state[project][id]) {
        return console.warn('got history for unknown build')
      }
      store.update({
        [project]: {
          [id]: {
            events: {$set: events}
          }
        }
      })
    }
  },

  builds: {
    fetch(store, {projectId, builds}) {
      const bmap = builds.reduce((bmap, b) => {
        bmap[b.id] = b
        return bmap
      }, {})
      store.update({
        [projectId]: {$set: bmap}
      })
    }
  },
}

