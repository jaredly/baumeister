import classnames from 'classnames'

import React from 'react'
import {Link} from 'react-router'
import {Map, fromJS} from 'immutable'

import {Radio, Panes, Form, FormSection} from 'formative'

import merge from 'recursive-merge'

import './project-config.less'
import '../lib/form.less'

import RemoveButton from './remove-button'
import globalConfig from '../../../config'

const PT = React.PropTypes

export default class ProjectConfig extends React.Component {
  onSubmit(data, action) {
    this.props.onClose()
    this.props.onSubmit(data, action)
  }

  renderClearButton() {
    if (!this.props.onClear) return
    let text = 'Clear Cache'
    let disabled = false
    if (this.props.cacheStatus === true) {
      text = 'Clearing...'
      disabled = true
    } else if (this.props.cacheStatus) {
      text = 'Try Again'
    }
    return <button
      className='Button ProjectConfig_clear'
      type='button'
      disabled={disabled}
      onClick={this.props.onClear}>
      {text}
    </button>
  }

  render() {
    return <Form className='ProjectConfig' initialData={this.props.project} onSubmit={this.onSubmit.bind(this)}>
      <div className='ProjectConfig_top'>
        <label className='text-label ProjectConfig_name'>Project Name
          <input type='text' className='ProjectConfig_name' name="name" title="Name" placeholder="Project name"/>
        </label>

        <div className='ProjectConfig_buttons'>
          {this.renderClearButton()}
          <button className='Button'>{this.props.actionText}</button>
        </div>
      </div>

      {renderBuilders()}

      <PluginConfig name='plugins'/>

      {this.props.onRemove && <RemoveButton className='RemoveButton' onRemove={this.props.onRemove}/>}
    </Form>
  }
}

function specToDefaults(spec) {
  const res = {}
  Object.keys(spec).forEach(name => {
    if (spec[name].type === 'section') {
      res[name] = specToDefaults(spec[name].spec)
    } else {
      res[name] = spec[name].default
    }
  })
  return res
}

function renderBuilders() {
  const choices = {}
  const defaultData = {}
  const children = []
  const names = Object.keys(globalConfig.builders)
  names.forEach(name => {
    const builder = globalConfig.builders[name]
    choices[name] = builder.title || name
    defaultData[name] = {
      id: name,
      config: merge({}, specToDefaults(builder.projectConfig.schema),
                    globalConfig.builderConfig && globalConfig.builderConfig[name] || {})
    }
    children.push(<div key={name} switchWhere={name}>
      <div className='ProjectConfig_builder_description'>{builder.description}</div>
      {builder.projectConfig && FormSection.fromSpec({
        name: 'config',
        spec: builder.projectConfig.schema
      })}
    </div>)
  })

  return <Radio
    name='builder'
    title='Builder'
    choices={choices}
    switchOn={val => val ? val.get('id') : names[0]}
    children={children}
    defaultData={defaultData}/>
}

function builderTitle(name) {
  return globalConfig.builders[name].title || name
}

function builderTitles(names) {
  const ret = []
  for (let i=0; i<names.length - 2; i++) {
    ret.push(<span className='PluginConfig_builder'>
      {builderTitle(names[i])}</span>)
    ret.push(', ')
  }
  if (names.length > 1) {
    ret.push(<span className='PluginConfig_builder'>
      {builderTitle(names[names.length - 2])}</span>)
    ret.push(' or ')
  }
  ret.push(<span className='PluginConfig_builder'>
    {builderTitle(names[names.length - 1])}</span>)
  return ret
}

class PluginConfig extends React.Component {
  constructor(props) {
    super(props)
  }

  addPlugin(event) {
    const name = event.target.value
    if (!name) return
    const pConfig = globalConfig.plugins[name].projectConfig || {}
    let config = merge({}, pConfig.schema ? specToDefaults(pConfig.schema) : {})
    this.props.onChange(this.props.value.set(name, fromJS(config)))
  }

  removePlugin(name) {
    this.props.onChange(this.props.value.delete(name))
  }

  static contextTypes = {
    formData: PT.object,
  }

  render() {
    const plugins = this.props.value
    const installed = globalConfig.plugins
    const using = plugins.keySeq().sort((a, b) => {
      if (!installed[a] && !installed[b]) {
        return a > b ? 1 : -1
      }
      if (!installed[a]) return 1
      if (!installed[b]) return -1
      const sa = installed[a].sort
      const sb = installed[b].sort
      if (sa === undefined && sb === undefined) {
        return a > b ? 1 : -1
      }
      if (sa === undefined) return 1
      if (sb === undefined) return -1
      return sa - sb
    })

    const builderNames = Object.keys(globalConfig.builders)
    const currentBuildType = this.context.formData && this.context.formData.getIn(['builder', 'id']) || globalConfig.defaultBuilder || builderNames[0]

    return <div>
      <div className='ProjectConfig_addplugin'>
        <span className='ProjectConfig_plugins-title'>Plugins</span>
        <select value='' onChange={this.addPlugin.bind(this)}>
          <option value=''>Add a plugin</option>
          {Object.keys(installed).map(name => !plugins.has(name) && <option value={name}>{installed[name].title || name}</option>)}
        </select>
      </div>

      {using.map(name => {
        const unavailable = !installed[name]
        const disabled = !unavailable && installed[name].buildTypes && installed[name].buildTypes.indexOf(currentBuildType) === -1
        return <div className='ProjectConfig_section'>
          <div className='PluginConfig_top section-title'>
            <span className='PluginConfig_title'>
              {unavailable ? name : installed[name].title || name}
            </span>
            <span className='PluginConfig_description'>
              {unavailable ? '' : installed[name].description}
            </span>
            <div className='PluginConfig_spacer'/>
            <button type='button' className='Button' onClick={this.removePlugin.bind(this, name)}>Remove</button>
          </div>
          {unavailable ? 
            <div className='ProjectConfig_section_body PluginConfig_disabled'>
              This plugin is not available in this installation of Jaeger. Check your config file.
            </div>
            : (disabled ?
            <div className='ProjectConfig_section_body PluginConfig_disabled'>
              This plugin is incompatible with the <span className='PluginConfig_builder'>
                {globalConfig.builders[currentBuildType].title || currentBuildType}
              </span> builder. It only works with {builderTitles(installed[name].buildTypes)}.
            </div>
            : FormSection.fromSpec({
            className: 'ProjectConfig_section_body',
            value: plugins.get(name),
            spec: installed[name].projectConfig.schema,
            onChange: val => this.props.onChange(plugins.set(name, val))
          }))}
        </div>
      })}
    </div>
  }
}

