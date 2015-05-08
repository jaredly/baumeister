
import GithubConfig from './config'
import GithubGlobalConfig from './global-config'
import prom from '../../../lib/prom'

export default {
  id: 'github-provider',
  title: 'Github Provider',
  plugin: __dirname + '/back.js',
  flux: (api, flux) => ({
    store: {
      init: {
        repos: null,
      },
      listeners: {
        'github-provider': {
          getRepos(value, update) {
            update({repos: {$set: value}})
          }
        }
      },
    },

    actions: {
      getRepos() {
        return api.get('/github-provider/repos')
        /*
        var xhr = new XMLHttpRequest()
        xhr.open('GET', 'https://api.github.com/user/repos?type=all&access_token=' + flux.stores.config.plugins['github-provider'].token)
        xhr.setRequestHeader('accept', 'application/vnd.github.moondragon+json')
        xhr.responseType = 'json'
        return prom(done => {
          xhr.onload = res => {
            done(null, xhr.response)
          }
          xhr.onerror = err => {
            done(err)
          }
          xhr.send()
        })
        */
      }
    },
  }),

  globalConfig: {
    form: GithubGlobalConfig,
    schema: {
      token: {
        type: 'text',
        default: '',
        description: 'Your github auth token',
      }
    },
  },

  projectConfig: {
    form: GithubConfig,
    schema: {
      cache: {
        type: 'checkbox',
        default: true,
        title: 'Cache project',
      },
    }
  }
}


