
import React from 'react'
import {fluxify} from 'flammable/react'
import {Form, Radio} from 'formative'

@fluxify({
  data: {
    config: 'config',
  },
  actions: {
    onSave: 'config.save',
  }
})
export default class AppConfig extends React.Component {
  saveConfig(data) {
    this.props.onClose()
    this.props.onSave(data)
  }

  render() {
    return <Form className='GlobalConfig'
        initialData={this.props.config}
        onSubmit={this.saveConfig.bind(this)}>
      <h1>Global Configuration</h1>
      <Radio
        name=''
        title='Notifications'
        switchOn='notifications'
        defaultData={{
          all: {notifications: 'all'},
          none: {notifications: 'none'},
          failures: {notifications: 'failures'},
        }}
        choices={{
          all: 'All',
          none: 'None',
          failures: 'Failures'
        }}>
        {null}
      </Radio>
      <button className='Button GlobalConfig_save'>Save</button>
    </Form>
  }
}

