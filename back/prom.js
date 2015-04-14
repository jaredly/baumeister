
import Promise from 'bluebird'

export default function prom(fn) {
  return new Promise((res, rej) => {
    fn((err, val) => {
      if (err) return rej(err)
      res(val)
    })
  })
}

