
export default {
  id: '1111_localtester',
  name: 'local',
  modified: new Date(),
  plugins: {
    'local-provider': {
      path: '/home/jared/clone/nm/flammable/',
    },
    'shell-tester': {
      command: 'pwd;ls;make test',
      docker: {
        image: 'jaredly/node',
      }
    },
  },
}

