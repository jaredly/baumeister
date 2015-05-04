
export default {
  name: 'loco',
  modified: new Date(),
  plugins: {
    'git-provider': {
      cache: true,
      repo: 'https://github.com/notablemind/loco',
    },
    'npm-test': {},
    'npm-install': {},
  },
  builder: {
    id: 'docker',
    config: {
      prefab: 'docker-ci/component',
    },
  },
}

