
import React from 'react'
import {Link} from 'react-router'

import ProjectList from '../components/project-list'

export default class Home extends React.Component {
  render () {
    return <div className='Home'>
        <ProjectList/>
    </div>
  }
}
