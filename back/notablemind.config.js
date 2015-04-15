
export default {
  name: 'notablemind',
  modified: new Date(),
  source: {
    path: '/home/jared/clone/nm/',
    inPlace: true,
  }, 
  build: {
    prefab: 'jaredly/node',
  },
  test: {
    cwd: 'notablemind',
    cmd: 'npm test', // 'babel-node test/mvp.js',
  }
}

