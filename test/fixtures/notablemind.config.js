
export default {
  name: 'notablemind',
  modified: new Date(),
  plugins: {
    'local-provider': {
      path: '/home/jared/clone/nm/',
      inPlace: true,
    }, 
    'shell-tester': {
      docker: {
        image: 'jaredly/node',
      },
      cwd: 'notablemind',
      command: 'npm test', // 'babel-node test/mvp.js',
    }
  }
}

