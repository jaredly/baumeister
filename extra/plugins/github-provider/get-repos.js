
import prom from '../../../lib/prom'
import superagent from 'superagent'

const API = 'https://api.github.com'

function parseLinks(links) {
  return links.trim().split(/,/g).map(line => {
    const parts = line.split(/;/g)
    return parts.reduce((obj, part) => {
      const [key, val] = part.trim().split('=')
      obj[key.trim()] = val.trim().slice(1, -1)
      return obj
    }, {uri: parts.shift().trim().slice(1, -1)})
  }).reduce((obj, link) => {
    obj[link.rel] = link
    return obj
  }, {})
}

function getAllPages(uri) {
  let result = []
  return prom(done => {
    function next() {
      superagent.get(uri)
        .set('accept', 'application/vnd.github.moondragon+json')
        .end((err, res) => {
          if (err) return done(err)
          const links = parseLinks(res.headers.link)
          result = result.concat(res.body)
          if (!links.next) return done(null, result)
          uri = links.next.uri
          next()
        })
    }
    next()
  })
}

function getApi(endpoint, token) {
  return getAllPages(API + endpoint + '?per_page=100&access_token=' + token)
}

export default function getRepos(token) {
  return getApi('/user/repos', token)
}

