
class TimeTracker {
  // called after a build finishes
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

function smallT(ms) {
  if (!ms) return ''
  if (ms < 100) return ms + 'ms'
  if (ms < 1000) return parseInt(ms / 10) / 100 + 's'
  if (ms < 10 * 1000) return parseInt(ms / 100) / 10 + 's'
  if (ms < 100 * 1000) return parseInt(ms / 1000) + 's'
  if (ms < 10 * 60 * 1000) return parseInt(ms / 1000) / 60 + 'm'
  if (ms < 100 * 60 * 1000) return parseInt(ms / (60 * 1000)) + 'm'
  return '>1h'
}

function noLeadZero(str) {
  if (str[0] === '0') return str.slice(1)
  return str
}

export default {
  title: 'Time Tracker',
  plugin: TimeTracker,
  blocks: {
    projectHeader(project, config) {
      const React = require('react')
      if (!project.pluginData['time-tracker']) {
        if (project.plugins['time-tracker']) {
          return <span style={{fontSize: 10}}>No time data</span>;
        }
      }
      class TimeViz extends React.Component {
        componentDidMount() {
          this.draw()
        }
        componentDidUpdate() {
          this.draw()
        }
        draw() {
          if (this.props.times.length < 2) {
            return;
          }
          const fullWidth = this.props.width
          const margin = 5
          const textWidth = 20
          const width = this.props.width - margin * 2 - textWidth

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
          ctx.strokeStyle = '#aaa'
          ctx.lineWidth = 1
          const xscale = width / (times.length - 1)
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
                    2, 0, 2 * Math.PI, false)
            ctx.fill()
          })
          ctx.fillStyle = '#333'
          ctx.fillText(noLeadZero(smallT(min)), fullWidth - textWidth, 30)
          ctx.fillText(noLeadZero(smallT(max)), fullWidth - textWidth, 10)
        }

        render() {
          if (!this.props.times.length) {
            return <span style={{fontSize: 10, width: this.props.width, height: 30}}>No time data</span>;
          }
          if (this.props.times.length < 2) {
            return <span style={{fontSize: 10, width: this.props.width, height: 30}}>Too little time data</span>;
          }
          return <canvas width={this.props.width + ''} height='30'/>
        }
      }
      return <TimeViz width={110} times={project.pluginData['time-tracker'].times}/>
    },
  },
  projectConfig: {
    schema: {
    }
  }
}

