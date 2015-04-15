import React from 'react'
import assign from 'object-assign'
import {fromJS} from 'immutable'
import classnames from 'classnames'

class Form extends React.Component {
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
    }, this.onSubmitButton.bind(this)))
  }

  render() {
    return <form className={classnames('Form', this.props.className)} onSubmit={this.onSubmit}>
      {this.makeChildren()}
    </form>
  }
}

function formulate(data, setter, submitter) {
  return function (props, type) {
    if (type === 'button') {
      if (props.onClick) return null
      return {
        onClick: e => {
          e.preventDefault()
          e.stopPropagation()
          submitter(props)
        }
      }
    }
    if (undefined === props.name) return null
    const isInput = type === 'input'
    const isCheckbox = isInput && props.type === 'checkbox'
    const isRadio = isInput && props.type === 'radio'
    if (typeof type === 'string' && !isInput && type !== 'textarea') {
      return null
    }
    const parts = props.name === '' ? [] : props.name.split('.')
    const val = parts.reduce((obj, attr) => {
      if (!obj) return null
      return obj.get(attr)
    }, data)

    const cb = e => {
      if (isRadio && !e.target.checked) return
      let val
      if (isCheckbox) val = e.target.checked
      else if (isRadio) val = props.value
      else if (isInput || type === 'textarea') val = e.target.value
      else val = e

      setter(parts, val)
    }

    const props = {
      onChange: cb,
    }

    if (isCheckbox) {
      props.checked = val
    } else if (isRadio) {
      props.checked = val === props.value
    } else {
      props.value = val
    }

    return props
  }
}

function walkChildren(children, newProps) {
  return React.Children.map(children, child =>
    typeof child === 'string' ? child :
    React.cloneElement(child, newProps(child.props, child.type), typeof child.type === 'string' ? walkChildren(child.props.children, newProps) : child.props.children)
  )
}

class Radio extends React.Component {
  constructor(props) {
    super(props)
    this.id = Math.random().toString(35).slice(0, 10)
    this.prevs = {}
  }

  onChange(val, current, e) {
    if (val === current) return
    if (!e.target.checked) {
      debugger
    }
    const current = this.getCurrent()
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
    }, null))
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

export {Form, Radio}

