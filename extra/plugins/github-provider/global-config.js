
import React from 'react'

export default class GithubGlobalConfig extends React.Component {
  render() {
    if (this.props.value && this.props.value.get('token')) {
      return <div>
        Authorized with github.
        <a className="Button" href="http://localhost:3005/plugins/github-provider/auth">Reauthorize</a>
      </div>
    }
    return <div>
      No token set. 
      <a className="Button" href="http://localhost:3005/plugins/github-provider/auth">Authorize with Github</a>
    </div>
  }
}

