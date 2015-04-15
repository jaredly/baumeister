
export default {
  name: 'loco',
  modified: new Date(),
  source: {
    provider: 'script',
    config: {
      cache: true,
      base: 'docker-ci/git',
      get: 'git clone https://github.com/notablemind/loco .',
      update: 'ls -a; git pull',
    },
  },
  build: {
    prefab: 'docker-ci/component',
  },
  test: {
    cmd: 'pwd;ls;npm test',
  },
  cleanup: {
    rmdir: true,
  },
}

