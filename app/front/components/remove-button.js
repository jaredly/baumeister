
import React from 'react'

export default class RemoveButton extends React.Component {
  constructor(props) {
    super(props)
    this.state = {really: false}
  }

  render() {
    if (this.state.really) {
      return <div className={this.props.className}>
        <button type="button" className='Button' onClick={() => this.setState({really: false})}>
          Maybe not
        </button>
        <button type="button" className='Button' onClick={this.props.onRemove}>
          Really Remove
        </button>
      </div>
    }

    return <button type="button" className={'Button ' + this.props.className} onClick={() => this.setState({really: true})}>
      Remove project
    </button>
  }
}

