
export const projectStore = {
  projects: {
    create(store, project) {
      store.update({[project.id]: {$set: project}})
    },
    fetch(store, data) {
      store.update({$set: data})
    },
    clearCache: {
      start(store, tid, [pid]) {
        store.update({[pid]: {cache: {$set: 'clearing'}}})
      },
      error(store, tid, {args: [pid], err}) {
        console.warn('failed to clear cache', pid, err)
        store.update({[pid]: {cache: {$set: 'failed'}}})
      },
      result(store, tid, pid) {
        store.update({[pid]: {cache: {$set: 'cleared'}}})
      },
    },
  },

  ws: {
    'ws:state': (store, newState) => {
      if (newState === 'connected') {
        store.sendAction('projects.fetch')
      }
    },
    'build:history': (store, {project, id}) => {
      if (!store.state[project] || !store.state[project].latestBuild || store.state[project].latestBuild.id !== id) return
      store.update({
        [project]: {
          latestBuild: {
            status: {$set: 'running'},
          }
        }
      })
    },
    'project:remove': (store, id) => {
      store.update({[id]: {$set: undefined}})
    },
    'project:update': (store, project) => {
      if ('string' === typeof project.latestBuild) {
        project.latestBuild = store.state[project.id].latestBuild
      }
      store.update({
        [project.id]: {$set: project}
      })
    },
    'build:new': (store, build) => {
      if (!store.state[build.project]) return
      store.update({
        [build.project]: {
          latestBuild: {$set: build}
        }
      })
    },
    'build:status': (store, data) => {
      const {project, build, status, duration, finished} = data
      const proj = store.state[project]
      if (!proj || !proj.latestBuild || proj.latestBuild.id !== build) return
      store.update({
        [project]: {
          latestBuild: {
            status: {$set: status},
            duration: {$set: duration},
            finished: {$set: finished}
          }
        }
      })
    },
  },
}

export const projectStatus = {
  projects: {
    fetch: {
      start(store, tid, args) {
        store.update({
          _status: {$set: 'loading'}
        })
      },
      error(store, tid, data) {
        store.update({
          _status: {$set: 'error'},
          _error: {$set: data.error},
        })
      },
      done(store, tid, data) {
        store.update({
          _status: {$set: 'done'}
        })
      },
    },

    clearCache: {
      start(store, tid, [id]) {
        if (!store.state[id]) {
          return store.update({[id]: {$set: {
            clearCache: {
              [tid]: true,
              latest: {tid, value: true},
            }
          }}})
        }
        store.update({[id]: {
          clearCache: {
            [tid]: {$set: true},
            latest: {$set: {tid, value: true}},
          }
        }})
      },

      error(store, tid, {args: [id], err}) {
        if (store.state[id].clearCache.latest.tid !== tid) {
          return store.update({[id]: {
            clearCache: {[tid]: {$set: err}}
          }})
        }
        store.update({[id]: {
          clearCache: {
            [tid]: {$set: err},
            latest: {value: {$set: err}}
          }
        }})
      },

      done(store, tid, {args: [id]}) {
        if (store.state[id].clearCache.latest.tid !== tid) {
          return store.update({[id]: {
            clearCache: {[tid]: {$set: null}}
          }})
        }
        store.update({[id]: {
          clearCache: {
            [tid]: {$set: null},
            latest: {value: {$set: null}}
          }
        }})
      },
    },
  }
}

