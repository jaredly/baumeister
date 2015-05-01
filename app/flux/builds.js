
import aggEvents from '../../lib/agg-events'

export const buildStore = {
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
}

