
export default {
  name: 'local',
  modified: new Date(),
  plugins: {
    'local-provider': {
      path: '/home/jared/clone/nm/flammable/',
      inPlace: true,
    },
    /*
    'docker-builder': {
      dockerfile: 'itreed/Docker.ci',
      context: false,
    },
    */
    'shell-tester': {
      // cwd: 'itreed/plugins/itreed-js',
      command: 'make test',
    },
  },
}
