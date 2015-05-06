
export default {
  name: 'test',
  modified: new Date(),
  plugins: {
    'shell-provider': {
      cache: true,
      get: 'echo "hello" > world.txt; sleep 5',
      update: 'echo "more" > world.txt; sleep 10',
      dockerImage: 'ubuntu',
    },
    'shell-tester': {
      command: 'grep hello world.txt\necho "one"\nsleep .1\necho "two"\nsleep .1\necho "three"\nsleep .1\necho "four"\nsleep 2\ncat world.txt\nfail',
    },
  },
}

