
export default {
  name: 'passes',
  modified: new Date(),
  plugins: {
    'local-provider': {
      path: __dirname + '/docker-ctx',
      inPlace: false,
    },
    'docker-builder': {
      dockerfile: 'Docker.build',
      context: 'other',
    },
    'shell-tester': {
      command: 'grep "hello other" world.txt; grep "hello base" world.txt',
    },
  },
}

