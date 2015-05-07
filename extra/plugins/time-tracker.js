
class TimeTracker {
  constructor(manager, app) {
    this.manager = manager
    this.app = app
  }

  onBuild(project, build, onStep, config) {
  }

  projectDataFromBuild(build, config, currentData, project) {
    const datum = {
      status: build.status,
      duration: build.duration,
      num: build.num,
    }
    return {
      times: currentData ? currentData.times.concat([datum]) : [datum],
    }
  }
}

export default {
  title: 'Time Tracker',
  plugin: TimeTracker,
  blocks: {
    projectHeader(project, config) {
      if (!project.pluginData['time-tracker']) return
      const React = require('react')
      class TimeViz extends React.Component {
        componentDidMount() {
          this.draw()
        }
        componentDidUpdate() {
          this.draw()
        }
        draw() {
          const ctx = React.findDOMNode(this).getContext('2d')
          ctx.clearRect(0, 0, 100, 20)
          if (!this.props.times.length) return
          let times = this.props.times.slice(-20)
          let max = 0, min = times[0].duration
          times.forEach(item => {
            if (item.duration > max) max = item.duration
            if (item.duration < min) min = item.duration
          })
          ctx.beginPath()
          ctx.strokeStyle = 'black'
          ctx.lineWidth = 1
          const xscale = 100 / times.length
          const yscale = 20 / (max - min)
          times.forEach((item, i) => {
            ctx.lineTo(5 + xscale * i,
                       5 + 20 - (item.duration - min) * yscale)
          })
          ctx.stroke()
          times.forEach((item, i) => {
            ctx.fillStyle = {
              succeeded: 'green',
              failed: 'red',
              errored: 'orange',
            }[item.status] || 'grey'
            ctx.beginPath()
            ctx.arc(5 + xscale * i,
                       5 + 20 - (item.duration - min) * yscale,
                    3, 0, 2 * Math.PI, false)
            ctx.fill()
          })
        }
        render() {
          return <canvas width='110' height='30'/>
        }
      }
      return <TimeViz times={project.pluginData['time-tracker'].times}/>
    },
  },
  projectConfig: {
    schema: {
      /*
      cache: {
        type: 'checkbox',
        default: true,
        title: 'Cache modules',
      },
      */
    }
  }
}

/*
module.exports = {
  provide(build, ctx, out, done) {
    build.runCached({
      docker: {
        image: config.source.base || 'ubuntu',
      },
    }, {
      cachePath: 'project',
      projectPath: '.',
      get: config.source.get,
      update: config.source.update,
    }, done)
  }
}
*/
