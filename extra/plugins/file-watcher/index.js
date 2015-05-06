

function projectPatterns(config) {
  if (!config.patterns) return []
  return config.patterns
    .split('\n').map(n => n.trim()).filter(n => n.length)
}

class FileWatcher {
  constructor(manager, app, clients) {
    this.manager = manager
    this.clients = clients
    this.app = app
    this.watchers = {}
    this.paused = {}
  }

  onProject(project, config) {
    // TODO handle a plugin being added by config
    if (!project.plugins['local-provider']) {
      throw new ConfigError('FileWatcher only works for local projects (via plugin local-provider)', 'file-watcher', 'Switch to using the `local-provider` plugin')
    }
    const patterns = projectPatterns(config)
    const Gaze = require('gaze').Gaze
    this.watchers[project.id] = new Gaze(patterns, {
      cwd: project.plugins['local-provider'].path
    })
    console.log('[FileWatcher] watching', patterns)
    this.watchers[project.id].on('all', () => {
      console.log('WWW', project.id)
      if (this.paused[project.id]) return
      this.clients.startBuild(project.id)
    })
    this.paused[project.id] = false
  }

  changeProject(project) {
    if (!this.watchers[project.id]) {
      return this.onProject(project)
    }
    const gaze = this.watchers[project.id]
    gaze.close()
    const patterns = projectPatterns(project)
    gaze.add(patterns)
    this.paused[project.id] = false
  }

  offProject(project, isReconfig) {
    if (this.watchers[project.id]) {
      this.watchers[project.id].close()
      delete this.watchers[project.id]
      delete this.paused[project.id]
    }
  }

  onBuild(project, build, config) {
    const gaze = this.watchers[project.id]
    this.paused[project.id] = true
    gaze.close()
  }

  offBuild(project, build, config) {
    if (this.watchers[project.id] && this.paused[project.id]) {
      const gaze = this.watchers[project.id]
      const patterns = projectPatterns(config)
      gaze.add(patterns)
      this.paused[project.id] = false
    }
  }
}

export default {
  id: 'file-watcher',
  title: 'File Watcher',
  plugin: FileWatcher,
  buildTypes: ['docker', 'local'],
  globalConfig: null,
  projectConfig: {
    schema: {
      interval: {
        type: 'number',
        default: 1,
        title: 'Watch interval (seconds)',
      },
      patterns: {
        type: 'text',
        default: 'lib/*',
        multiline: true,
        title: 'Patterns to watch',
      },
    }
  },
}

/*
export default {
  id: 'file-watcher',
}

Events I care about

- first startup (project that have me enabled)
- new project (with me enabled, flag for reconfigure)
- remove project (flag for reconfigure - e.g. no longer on that project, but it still exists)
- new build! for a project I'm on
  this is where we can do middleware and stuff?
  Maybe have a "Build" object that handles all of this stuff...
    So build.use('test', mymiddlepiece)


Future things
- might be interesting at some point to have a different build running that can do parallelism?

*/
