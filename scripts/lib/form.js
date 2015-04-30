import React from 'react'
import assign from 'object-assign'
import {fromJS} from 'immutable'
import classnames from 'classnames'
import walkChildren from './walk-children'
import formulate from './formulate'

export default class Form extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      data: fromJS(props.initialData)
    }
  }

  onSubmitButton(props) {
    // TODO get name=value from props
    this.props.onSubmit(this.state.data.toJS(), props.value)
  }

  onSubmit(e) {
    e.preventDefault()
    e.stopPropagation()
    this.props.onSubmit(this.state.data.toJS())
  }

  makeChildren() {
    return walkChildren(this.props.children, formulate(this.state.data, (path, val) => {
      if (!path || !path.length) {
        return this.setState({data: val})
      }
      this.setState({
        data: this.state.data.setIn(path, val)
      })
    }, this.onSubmitButton.bind(this)), child => (typeof child.type === 'string' || child.props.formPass))
  }

  render() {
    return <form className={classnames('Form', this.props.className)} onSubmit={this.onSubmit.bind(this)}>
      {this.makeChildren()}
    </form>
  }
}

