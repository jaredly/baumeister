
import aggEvents from '../../../lib/agg-events'

export const buildStore = {
  ws: {
    'build:new': (build, update, state) => {
      if (!state[build.project]) {
        return update({
          [build.project]: {$set: {[build.id]: build}}
        })
      }
      update({
        [build.project]: {
          [build.id]: {$set: build}
        }
      })
    },

    'build:update': (build, update, state) => {
      update({
        [build.project]: {
          [build.id]: {$set: build}
        }
      })
    },

    'build:event': ({project, build, event}, update, state, sendAction) => {
      if (!state[project][build]) {
        sendAction('builds.getHistory', build)
        return console.warn('got event for unknown build')
      }
      update({
        [project]: {
          [build]: {
            events: {
              $set: aggEvents([event], state[project][build].events)
            }
          }
        }
      })
    },

    'build:history': ({id, project, events}, update, state) => {
      if (!state[project][id]) {
        return console.warn('got history for unknown build')
      }
      update({
        [project]: {
          [id]: {
            events: {$set: events}
          }
        }
      })
    }
  },

  builds: {
    fetch({projectId, builds}, update) {
      const bmap = builds.reduce((bmap, b) => {
        bmap[b.id] = b
        return bmap
      }, {})
      update({
        [projectId]: {$set: bmap}
      })
    }
  },
}

