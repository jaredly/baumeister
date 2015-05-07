
class ExampleEventer {
  onBuild(project, build, onStep, config) {
    onStep('test', (builder, ctx, io) => {
      builder.pluginEvent('myevent', 23)
    })
  }
}

export default {
  id: 'example-eventer',
  title: 'Example eventer',
  plugin: ExampleEventer,
  events: {
    myevent(val) {
      const React = require('react')
      return <strong>My Event Happened! <img src="http://google.com/favicon.ico"/> {val}</strong>
    }
  }
}

