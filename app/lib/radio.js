
import React from 'react'
import classnames from 'classnames'

import walkChildren from './walk-children'
import formulate from './formulate'

export default class Radio extends React.Component {
  constructor(props) {
    super(props)
    this.id = Math.random().toString(35).slice(0, 10)
    this.prevs = {}
  }

  onChange(val, e) {
    const current = this.getCurrent()
    if (val === current) return
    if (!e.target.checked) {
      debugger
    }
    this.prevs[current] = this.props.value
    const data = this.prevs[val] === undefined ? this.props.defaultData[val] : this.prevs[val]
    this.props.onChange(fromJS(data))
  }

  getCurrent() {
    let choices = Object.keys(this.props.choices)
    let current
    if ('string' === typeof this.props.switchOn) {
      current = this.props.value && this.props.value.get(this.props.switchOn) || choices[0]
    } else {
      current = this.props.switchOn(this.props.value) || choices[0]
    }
    return current
  }

  getChildren(choices, current) {
    let children = null
    if (this.props.children) {
      React.Children.forEach(this.props.children, one => {
        if (one && one.props && one.props.switchWhere === current) {
          children = one
        }
      })
    } else if (this.props.body) {
      children = this.props.body(current)
    } else {
      return []
    }
    return children
  }

  render() {
    let choices = Object.keys(this.props.choices)
    let current
    if ('string' === typeof this.props.switchOn) {
      current = this.props.value && this.props.value.get(this.props.switchOn) || choices[0]
    } else {
      current = this.props.switchOn(this.props.value) || choices[0]
    }

    const children = walkChildren(this.getChildren(choices, current), formulate(this.props.value, (path, val) => {
      if (!path || !path.length) return this.props.onChange(val)
      this.props.onChange(this.props.value.setIn(path, val))
    }, null), child => (typeof child.type === 'string' || child.props.formPass))

    return <div className={classnames('Radio', this.props.className)}>
      <div className='Radio_buttons'>
        <span className='Radio_title'>{this.props.title}</span>
        {
          choices.map(val => <label key={val} className={
            classnames('Radio_button', val === current && 'Radio_button-active')
          }> <input
            type="radio"
            name={this.id}
            checked={val === current}
            onChange={this.onChange.bind(this, val, current)}/>
            {this.props.choices[val]}
            </label>)
        }
      </div>
      <div className='Radio_body'>
        {children}
      </div>
    </div>
  }
}


