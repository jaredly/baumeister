
import React from 'react'
import {fluxify} from 'flammable/react'
import {Form, Radio, FormSection} from 'formative'
import appConfig from '../../../config'

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
        rerender={true}
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
      <FormSection name='builders'>
        <h1>Builder Configuration</h1>
        {builderConfig()}
      </FormSection>
      <FormSection name='plugins'>
        <h1>Plugin Configuration</h1>
        {pluginConfig()}
      </FormSection>
      <button className='Button GlobalConfig_save'>Save</button>
    </Form>
  }
}

function pluginConfig() {
  const plugins = []
  Object.keys(appConfig.plugins).forEach(name => {
    const plugin = appConfig.plugins[name]
    if (!plugin.globalConfig) return
    plugins.push(<div key={name}>
      <h2>{plugin.title}</h2>
      <p>{plugin.description}</p>
      {plugin.globalConfig.form ? <plugin.globalConfig.form name={name}/> : FormSection.fromSpec({
        name: name,
        spec: plugin.globalConfig.schema,
      })}
    </div>)
  })
  return plugins.length ? plugins : <span>No plugins with global configuration</span>
}

function builderConfig() {
  const builders = []
  Object.keys(appConfig.builders).forEach(name => {
    const builder = appConfig.builders[name]
    if (!builder.globalConfig) return
    builders.push(<div key={name}>
      <h2>{builder.title}</h2>
      <p>{builder.description}</p>
      {FormSection.fromSpec({
        name: name,
        spec: builder.globalConfig.schema,
      })}
    </div>)
  })
  return builders.length ? builders : <span>No builders with global configuration</span>
}

