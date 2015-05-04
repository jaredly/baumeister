
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
      command: 'grep hello world.txt; echo "one";sleep 10;echo "two";sleep 10;echo "three";sleep 10;echo "four";sleep 20;cat world.txt;fail',
    },
  },
}

