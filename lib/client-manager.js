
import aggEvents from '../lib/agg-events'
import Client from './ws-client'
import Replayable from './replayable'

/**
 * Manages interaction between Clients and builds.
 *
 * Client stockets are added to the client manager via
 * `.newConnection(socket)`, and then communicated with.
 *
 * There are two types of events that get sent -- broadcast events and build
 * events.
 *
 * - Broadcast events are sent to all connected clients, and deal with
 *   infrequent events (build started, project added, configuration changed)
 *   that all front-ends should know about
 * - Build events can be very high volume, and as such are only sent to
 *   clients that are currently listening *to that build*
 *
 *
 * A client can only listen to one build at a time, and indicates which build
 * it is listening to via the `build:view` event.
 *
 * A client can subscribe to updates.
 */
export default class ClientManager {
  constructor(io, dao, builds, logger) {
    this.io = io
    this.dao = dao
    this.builds = builds
    this.logger = logger
    this.clients = []
    this.subs = {}

    io.on('config:save', value => {
      this.emit('config:change', value)
    })
    io.on('project:update', project => {
      this.emit('project:update', project)
    })
    io.on('project:delete', project => {
      this.emit('project:delete', project.id)
    })
    io.on('start build', ({project, trigger}) => {
      this.startBuild(project, trigger)
    })
  }

  /**
   * Called when the server starts. Doesn't do anything at the moment.
   */
  init() {
  }

  /**
   * Start off a build (in respnnse to a client event)
   *
   * trigger is an object describing what started the build. It should have at
   * least {
   *   source: str the id of the plugin, or `ui`
   *   user: the person who started the build (might map to a baumeister user,
   *   or a github user, etc).
   * }
   */
  startBuild(projectId, trigger, onId) {
    this.logger.info('START build', projectId, trigger)
    const io = new Replayable()

    const prom = this.builds.startBuild(projectId, trigger, io, buildId => {
      // this is called once an ID has been created
      // meaning that the project exists and the build has been created, but
      // not yet started.
      onId && onId(buildId)
      /** Hook up IO -> ClientEmit **/
      let section = null
      io.on('build:created', data => {
        this.emit('build:new', data)
      })
      const cman = this
      io.pipe({
        emit(evt, val) {
          if (evt === 'section') section = val
          cman.emit(buildId, 'build:event', {
            build: buildId,
            project: projectId,
            event: {evt, val, section, time: Date.now()}
          })
        }
      })
    }).then(({project, build}) => {
      this.logger.info('BUILD DONE', project.name, build.id)
      this.emit('build:update', build)
      this.emit('build:status', {
        project: project.id,
        build: build.id,
        duration: build.duration,
        finished: build.finished,
        status: build.status
      })
      this.emit('build:done', {
        project: {
          id: project.id,
          name: project.name
        },
        build: {
          id: build.id,
          num: build.num,
          duration: build.duration,
          status: build.status
        }
      })
    }, error => {
      this.logger.error('BUILD ERROR')
      this.logger.error(error.message)
      this.logger.error(error.stack)
      this.emit('build:error', {
        error,
      })
    })

    return {io, prom}
  }

  /**
   * Add a client socket to be managed.
   *
   * Events that are listened to:
   *
   * - build:start projectId     ; start a build! the client is automatically viewing the new build
   * - build:get-history buildId ; responded to with a build:history
   * - build:view buildId        ; indicate the current build being viewed
   */
  newConnection(socket) {
    const client = new Client(socket)
    this.clients.push(client)
    client.on('build:start', projectId => {
      this.startBuild(projectId, {
        source: 'ui',
        info: {},
      }, id => {
        this._unSub(client.openBuild, client)
        client.openBuild = id
        this._addSub(client.openBuild, client, true)
      })
    })

    client.on('build:get-history', id => {
      client.send('build:history', {
        id,
        project: this.builds.getProjectForBuild(id),
        events: aggEvents(this.builds.getBuildHistory(id))
      })
    })

    client.on('build:view', id => {
      if (!this.builds.isRunning(id)) {
        return // not running
      }
      this._unSub(client.openBuild, client)
      client.openBuild = id
      this._addSub(client.openBuild, client)
      client.send('build:history', {
        id,
        project: this.builds.getProjectForBuild(id),
        events: aggEvents(this.builds.getBuildHistory(id))
      })
    })

    socket.on('close', () => {
      this.clients.splice(this.clients.indexOf(client), 1)
    })
  }

  /**
   * Used internally
   *
   * emit(buildId, evt, value) - build event
   * emit(evt, value)          - broadcast event
   */
  emit(id, evt, val) {
    if (arguments.length === 2) {
      this.clients.forEach(c => c.send(id, evt))
      return val
    }
    if (!this.subs[id]) return
    this.subs[id].forEach(c => c.send(evt, val))
  }

  _addSub(id, fn, force) {
    if (!this.builds.isRunning(id) && !force) return
    if (!this.subs[id]) this.subs[id] = [fn]
    else this.subs[id].push(fn)
  }

  _unSub(id, fn) {
    if (!id || !this.subs[id]) return
    const ix = this.subs[id].indexOf(fn)
    if (ix === -1) return false
    this.subs[id].splice(ix, 1)
    return true
  }
}

