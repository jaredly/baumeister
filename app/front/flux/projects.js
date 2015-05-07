
export const projectStore = {
  projects: {
    create(project, update) {
      update({[project.id]: {$set: project}})
    },
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
    'ws:state': (newState, update, state, sendAction) => {
      if (newState === 'connected') {
        sendAction('projects.fetch')
      }
    },
    'build:history': ({project, id}, update, state) => {
      if (!state[project] || !state[project].latestBuild || state[project].latestBuild.id !== id) return
      update({
        [project]: {
          latestBuild: {
            status: {$set: 'running'},
          }
        }
      })
    },
    'project:remove': (id, update) => {
      update({[id]: {$set: undefined}})
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
      const {project, build, status, duration, finished} = data
      const proj = state[project]
      if (!proj || !proj.latestBuild || proj.latestBuild.id !== build) return
      update({
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
      start(tid, args, update) {
        update({
          _status: {$set: 'loading'}
        })
      },
      error(tid, data, update) {
        update({
          _status: {$set: 'error'},
          _error: {$set: data.error},
        })
      },
      done(tid, data, update) {
        update({
          _status: {$set: 'done'}
        })
      },
    },

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
}

