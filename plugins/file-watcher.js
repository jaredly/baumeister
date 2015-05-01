
const Gaze = require('gaze').Gaze

function projectPatterns(config) {
  return config.patterns
    .split('\n').map(n => n.trim()).filter(n => n.length)
}

export default class FileWatcher {
  constructor(manager, app) {
    this.manager = manager
    this.app = app
    this.watchers = {}
    this.paused = {}
  }

  onProject(project, config) {
    if (!project.source.path) {
      return console.error('File-watcher can only work for local projects')
    }
    const patterns = projectPatterns(config)
    this.watchers[project.id] = new Gaze(patterns, {
      cwd: project.source.path
    })
    console.log('watching', patterns)
    this.watchers[project.id].on('all', () => {
      if (this.paused[project.id]) return
      this.manager.startBuild(project.id)
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
