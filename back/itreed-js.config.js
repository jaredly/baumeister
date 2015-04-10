
export default {
  name: 'itreed',
  modified: new Date(),
  source: {
    path: '/home/jared/clone/nm/'
  }, 
  build: {
    dockerfile: 'itreed/Docker.ci',
    context: false,
  },
  test: {
    cwd: 'itreed/plugins/itreed-js',
    cmd: 'make', // 'babel-node test/mvp.js',
  }
}
