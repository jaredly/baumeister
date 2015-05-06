
export default {
  name: 'passes',
  modified: new Date(),
  plugins: {
    'local-provider': {
      path: __dirname + '/docker-ctx',
      inPlace: true,
    },
    'docker-builder': {
      dockerfile: 'Docker.build',
      context: true,
    },
    'shell-tester': {
      command: 'grep "hello root" world.txt; grep "hello base" world.txt',
    },
  },
}

