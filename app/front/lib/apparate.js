
import React from 'react'

export default class Apparate extends React.Component {
  constructor(props) {
    super(props)
    this.state = {moving: false}
    this._curChildren = props.children
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.children && this.props.children) {
      this._resize = false
      this._curChildren = nextProps.children
      return this.setState({state: 'idle'})
    }
    if (!nextProps.children && !this.props.children) {
      this._resize = false
      this._curChildren = nextProps.children
      return this.setState({state: 'idle'})
    }

    this._movingChildren = this.props.children || nextProps.children
    this._resize = true

    var node = React.findDOMNode(this)
    this._width = 'initial'
    this._height = 'initial'

    var st = node.getBoundingClientRect()
    node.style.transition = 'initial'
    node.style.height = st.height + 'px'
    node.style.width = st.width + 'px'

    this.setState({
      state: 'checking',
      motion: nextProps.children ? 'expanding' : 'collapsing'
    })
  }

  componentDidUpdate() {
    if (!this._resize) return
    this._resize = false

    var node = React.findDOMNode(this)
    var bef = window.getComputedStyle(node)
      , height = bef.height
      , width = bef.width
      , oheight = this._height
      , owidth = this._width
      , otransition = this._transition
    node.style.transition = 'initial'
    node.style.height = oheight
    node.style.width = owidth
    var aft = window.getComputedStyle(node)
      , awidth = aft.width
      , aheight = aft.height
    if (awidth === width && aheight === height) {
      node.style.removeProperty('height')
      node.style.removeProperty('width')
      return
    }

    node.style.height = height
    node.style.width = width
    node.style.overflow = 'hidden'
    node.offsetWidth
    node.offsetHeight
    let time = Math.abs((parseInt(height) - parseInt(aheight)) / 1000)
    if (time > .5) time = .5
    node.style.transition = `width ${time}s ease, height ${time}s ease`
    node.style.height = aheight
    node.style.width = awidth

    var done = () => {
      node.style.removeProperty('transition')
      node.style.removeProperty('overflow')
      node.style.removeProperty('height')
      node.style.removeProperty('width')
      delete this._tout
      this._movingChildren = this.props.children
      this.setState({state: 'idle'})
    }
    if (this._tout) {
      clearTimeout(this._tout)
    }
    this._tout = setTimeout(done, time * 1000)

    if (aheight > height) {
      this._curChildren = this.props.children
      this._nextLarge = true
    } else {
      this._nextLarge = false
    }
    // this._curChildren = 'moving'//this.props.children
    this.setState({state: 'moving'})
  }

  render() {
    const state = this.state.state
    if (state === 'idle') {
      return <div><div>{this.props.children}</div></div>
    }
    if (this.state.motion === 'expanding') {
      return <div><div>{this.props.children}</div></div>
    }
    return <div>
      <div style={{
        display: this.state.state === 'checking' ? 'none' : 'block'
      }}>{this._movingChildren}</div>
    </div>

    /*
    if (this.state.state === 'checking') {
    }
    if (this.state.state == 'idle'
    return <div>
      <div key="real" style={{
        display: this.state.moving ? 'none' : 'block'
      }}>{this.state.moving ? null : this.props.children}</div>
      <div key="tmp" style={{
        display: this.state.moving ? 'block' : 'none'
      }}>{!this._nextLarge && !this.state.moving ? null : this._curChildren}</div>
    </div>
    */
  }

  static wrap(obj, key, descriptor) {
    const render = descriptor.value
    descriptor.value = function () {
      return <Morpher>{render.call(this)}</Morpher>
    }
  }
}


