import classnames from 'classnames'

import React from 'react'
import {Link} from 'react-router'
import FluxComponent from 'flummox/component'

import {Form, Radio} from './form'
import './project-config.less'

const defaultProviderData = {
  script: {
    base: 'ubuntu',
    get: '# get some data',
    update: '# update the project',
  }
}

function makeProviderConfig(provider) {
  if (provider !== 'script') {
    return <span>Unconfigurable</span>
  }
  return <div>
    <input type='text' name='config.base' placeholder="Docker image"/>
    <input type='text' name='config.get' placeholder='Shell command to get data'/>
    <input type='text' name='config.update' placeholder='Shell command to update data'/>
  </div>
}

export default class ProjectConfig extends React.Component {
  constructor(props) {
    super(props)
  }

  onSubmit(data, action) {
    if (action === 'cancel') {
      console.log('CANCEL')
    }
    console.log(data)
    this.props.onClose()
  }

  render() {
    return <Form className='ProjectConfig' initialData={this.props.project} onSubmit={this.onSubmit.bind(this)}>
      <label className='text-label'>Project Name
        <input type='text' className='ProjectConfig_name' name="name" title="Name" placeholder="Project name"/>
      </label>
      <section className='ProjectConfig_source'>
        <h3>Source</h3>
        <Radio
          name='source'
          choices={{local: 'Local path', provider: 'Provider'}}
          switchOn={val => val.get('path') ? 'local' : 'provider'}
          defaultData={{
            local: {path: '/'},
            provider: {provider: 'script', config: {}}
          }}
        >
          <label className='ProjectConfig_source-local text-label'>
            Local path:
            <input type='text' name='path' placeholder="local path to project"/>
          </label>
          <div className='ProjectConfig_source-provider'>
            <h4>Provider</h4>
            <Radio
              name=''
              choices={{script: 'Bash script'}}
              defaultData={defaultProviderData}
              switchOn='provider'
              body={current => makeProviderConfig(current)}/>
          </div>
        </Radio>
      </section>

      <section className='ProjectConfig_build'>
        <h3>Build Step</h3>
        <Radio
          name='build'
          choices={{
            file: 'From Dockerfile',
            prefab: 'From prefab image',
          }}
          defaultData={{
            file: {dockerfile: 'Dockerfile', context: true, noRebuild: false},
            prefab: {prefab: 'docker-ci/node'}
          }}
          switchOn={val => {
            if (val === true) return 'file'
            if (typeof val === 'string') return 'file'
            return val.get('dockerfile') ? 'file' : 'prefab'
          }}>
          <div className='ProjectConfig_dockerfile'>
            <label className='text-label'>
              Dockerfile location (within project):
              <input className='mono-text' type='text' name="dockerfile" placeholder="Dockerfile"/>
            </label>
            <label>
              <h4>Context</h4>
              <Radio
                name='context'
                choices={{
                  none: 'No context',
                  full: 'Full project',
                  path: 'Subdirectory',
                }}
                switchOn={val => {
                  if (val === true) return 'full'
                  if (val === false) return 'none'
                  return 'path'
                }}
                defaultData={{
                  full: true,
                  none: false,
                  path: 'some/subdir',
                }}
                >
                <span/>
                <span/>
                <input className='mono-text' name='' type='text' placeholder='some/directory'/>
              </Radio>
            </label>
            <label className='checkbox-label'>
              <input type="checkbox" name="noRebuild"/>
              Don't rebuild (use existing image if available)
            </label>
          </div>
          <div classname='ProjectConfig_prefab'>
            <label className='text-label'>Docker image name: <input type='text' name="prefab" placeholder="ubuntu:latest"/></label>
          </div>
        </Radio>
      </section>
      <button>Submit me!</button>
      <button name='action' value='cancel'>Cancel</button>
    </Form>
  }
}
