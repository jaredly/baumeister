
export default {
  name: 'passes',
  modified: new Date(),
  plugins: {
    'shell-provider': {
      cache: true,
      get: 'echo "hello" > world.txt',
      update: 'echo "more" > world.txt',
      dockerImage: 'ubuntu',
    },
    'shell-tester': {
      command: 'grep hello world.txt',
    },
  },
}

