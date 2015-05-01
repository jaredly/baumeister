
import Promise from 'bluebird'

export default function psomse(promises) {
  return Promise.all(promises.map(prom =>
    prom.then(val => ({value: val}))
        .catch(err => ({error: err}))))
}

