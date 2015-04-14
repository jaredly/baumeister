
import React from 'react'
import {Link} from 'react-router'
import FluxComponent from 'flummox/component'

import ProjectList from './project-list'

export default class Home extends React.Component {
  render () {
    return <div className='Home'>
      Welcome home!
      <FluxComponent connectToStores={['projects']}>
        <ProjectList/>
      </FluxComponent>
    </div>
  }
}

