
import React from 'react'
import classnames from 'classnames'

import mmSS from './mmSS'

export default class Ticker extends React.Component {
  constructor(props) {
    super(props)
    this.state = {dur: Date.now() - props.start}
    this._ival = setInterval(_ => {
      this.setState({dur: Date.now() - this.props.start})
    }, 83)
  }

  componentWillUnmount() {
    clearInterval(this._ival)
  }

  render() {
    return <span className={classnames('Ticker', this.props.className)}>{mmSS(this.state.dur)}</span>
  }
}

