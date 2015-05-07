
import React from 'react'

export default class Apparate extends React.Component {
  constructor(props) {
    super(props)
    this.state = {moving: false, state: 'idle'}
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
      , oheight = 'initial'
      , owidth = 'initial'
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
      node.style.removeProperty('overflow')
      node.style.removeProperty('transition')
      this._movingChildren = this.props.children
      if (this.state.state !== 'idle') {
        this.setState({state: 'idle'})
      }
      return
    }

    node.style.height = height
    node.style.width = width
    node.style.overflow = 'hidden'
    node.offsetWidth
    node.offsetHeight
    let time = Math.abs((parseInt(height) - parseInt(aheight)) / 1500)
    if (time > .5) time = .5
    if (time < .3) time = .3
    node.style.transition = `width ${time}s ease, height ${time}s ease`
    node.style.height = aheight
    node.style.width = awidth

    /** failed attempt at preemting jank.
     * Another possibility is to do ease-in until halfway and then ease-out
     * for the rest of the way, with the recalculated "rest". However, that
     * might also result in jank.
     * I could also roll my own js-based animations...
    clearTimeout(this._tout2)
    if (this.state.motion === 'expanding') {
      this._tout2 = setTimeout(() => {
        node.style.height = node.scrollHeight + 'px'
      }, time * 500)
    }
    **/

    var done = () => {
      node.style.removeProperty('transition')
      delete this._tout

      var st = node.getBoundingClientRect()
      node.style.transition = 'initial'
      node.style.height = st.height + 'px'
      node.style.width = st.width + 'px'

      // double checking (in case contents changed size while sliding)
      this._resize = true
      this.setState({state: 'checking'})
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
  }

  static wrap(obj, key, descriptor) {
    const render = descriptor.value
    descriptor.value = function () {
      return <Morpher>{render.call(this)}</Morpher>
    }
  }
}


