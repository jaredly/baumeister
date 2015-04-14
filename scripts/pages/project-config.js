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
        <Radio
          name='source'
          title='Source'
          choices={{local: 'Local path', provider: 'Provider'}}
          switchOn={val => val.get('path') ? 'local' : 'provider'}
          defaultData={{
            local: {path: '/'},
            provider: {provider: 'script', config: {}}
          }}
        >
          <label switchWhere='local' className='ProjectConfig_source-local text-label'>
            Local path:
            <input type='text' name='path' placeholder="local path to project"/>
          </label>
          <Radio
            name=''
            switchWhere='provider'
            className='ProjectConfig_source-provider'
            title='Provider'
            choices={{script: 'Bash script'}}
            defaultData={defaultProviderData}
            switchOn='provider'
            body={current => makeProviderConfig(current)}/>
        </Radio>

        <Radio
          name='build'
          title='Build Step'
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
          <div switchWhere='file' className='ProjectConfig_dockerfile'>
            <label className='text-label'>
              Dockerfile location (within project):
              <input className='mono-text' type='text' name="dockerfile" placeholder="Dockerfile"/>
            </label>
            <Radio
              name='context'
              title='Context'
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
              <input switchWhere='path' className='mono-text' name='' type='text' placeholder='some/directory'/>
            </Radio>
            <label className='checkbox-label'>
              <input type="checkbox" name="noRebuild"/>
              Don't rebuild (use existing image if available)
            </label>
          </div>
          <div switchWhere='prefab' classname='ProjectConfig_prefab'>
            <label className='text-label'>Docker image name: <input type='text' name="prefab" placeholder="ubuntu:latest"/></label>
          </div>
        </Radio>

      <section className='ProjectConfig_section'>
        <div className='section-title'>Test Step</div>
        <div className='ProjectConfig_section_body'>
          <label className='text-label'>Working Directory
            <input type='text' name='test.cwd'/>
          </label>
          <label className='text-label'>Test Command
            <textarea name='test.cmd'/>
          </label>
        </div>
      </section>
      <button>Submit me!</button>
      <button name='action' value='cancel'>Cancel</button>
    </Form>
  }
}
