
import Promise from 'bluebird'

export default {
  get: send.bind('GET'),
  post: send.bind('POST'),
}

function send(method, url, headers, body) {
  if (arguments.length === 3) {
    body = headers
    headers = {}
  }
  if (!headers) headers = {}
  const xhr = new XMLHttpRequest()
  xhr.open(method, url)
  headers['Content-type'] = 'application/json'
  headers['Accept'] = 'application/json'
  for (var name in headers) {
    xhr.setRequestHeader(name, headers[name])
  }
  xhr.responseType = 'json'

  return new Promise((resolve, reject) => {
    xhr.onload = _ => {
      if (xhr.status > 210) {
        return reject(new Error(`Unexpected status: ${xhr.status}`))
      }
      if (!xhr.response && xhr.status !== 204) {
        return reject(new Error('No response'))
      }
      resolve(xhr.response)
    }

    xhr.onerror = function () {
      reject(new Error('Failed to connect'))
    }
    xhr.onabort = function () {
      reject(new Error('Connection cancelled'))
    }

    if (data) {
      xhr.send(JSON.stringify(data))
    } else {
      xhr.send()
    }
  })
}

