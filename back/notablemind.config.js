
export default {
  name: 'notablemind',
  modified: new Date(),
  source: {
    path: '/home/jared/clone/nm/'
  }, 
  build: {
    prefab: 'jaredly/node',
    /*
    dockerfile: 'notablemind/Dockerfile',
    context: false,
    */
  },
  test: {
    cwd: 'notablemind',
    cmd: 'echo "hi"', // 'babel-node test/mvp.js',
  }
}

