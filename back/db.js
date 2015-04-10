
import levelup from 'level'
import sublevel from 'level-sublevel'
import Promise from 'bluebird'
import jsonQueryEngine from 'jsonquery-engine'
import levelQuery from 'level-queryengine'

function prom(fn) {
  return new Promise((res, rej) => {
    fn((err, val) => {
      if (err) return rej(err)
      res(val)
    })
  })
}

export default class Db {
  constructor(path, cols, back) {
    const opts = {valueEncoding: 'json'}
    if (back) {
      opts.db = back
      this._db = sublevel(levelup(opts))
    } else {
      this._db = sublevel(levelup(path, opts))
    }
    this.cols = {}
    for (let name in cols) {
      let db = this._db.sublevel(name)
      db = levelQuery(db)
      db.query.use(jsonQueryEngine())
      cols[name].forEach(attr => db.ensureIndex(attr))
      this.cols[name] = db
    }
  }

  find(doc, query) {
    return prom(done => {
      const items = []
      this.cols[doc].query(query)
        .on('data', item => items.push(item))
        .on('error', err => done(err))
        .on('end', _ => done(null, items))
    })
  }

  get(doc, id) {
    return prom(done => this.cols[doc].get(id, done))
  }

  all(doc) {
    return prom(done => {
      const items = []
      this.cols[doc]
        .createReadStream()
        .on('data', item => items.push(item))
        .on('error', done)
        .on('end', _ => done(null, items))
    })
  }

  put(doc, id, val) {
    return prom(done => this.cols[doc].put(id, val, done))
  }

  batch(doc, ops) {
    return prom(done => this.cols[doc].batch(ops, done))
  }
}

