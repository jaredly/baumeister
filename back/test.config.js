
export default {
  name: 'test',
  modified: new Date(),
  source: {
    provider: 'script',
    config: {
      base: 'ubuntu',
      get: 'echo "hello" > world.txt',
      update: 'echo "more" >> world.txt',
    },
  },
  build: {
    prefab: 'ubuntu',
  },
  test: {
    cmd: 'echo "one";sleep 10;echo "two";sleep 10;echo "three";sleep 10;echo "four";sleep 20;cat world.txt;fail',
  },
  cleanup: {
  },
}

