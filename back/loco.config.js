
export default {
  name: 'loco',
  modified: new Date(),
  source: {
    provider: 'script',
    config: {
      base: 'docker-ci/git',
      get: 'git clone https://github.com/notablemind/loco .',
      update: 'git pull',
    },
  },
  build: {
    prefab: 'docker-ci/component',
  },
  test: {
    cmd: 'make test',
  },
  cleanup: {
    rmdir: true,
  },
}

