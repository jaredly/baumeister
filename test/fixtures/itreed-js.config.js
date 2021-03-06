
export default {
  name: 'itreed',
  modified: new Date(),
  builder: {
    id: 'docker',
  },
  plugins: {
    'local-provider': {
      path: '/home/jared/clone/nm/',
      inPlace: true,
    },
    'docker-builder': {
      dockerfile: 'itreed/Docker.ci',
      context: false,
    },
    'shell-tester': {
      cwd: 'itreed/plugins/itreed-js',
      command: 'make',
    },
  },
}

