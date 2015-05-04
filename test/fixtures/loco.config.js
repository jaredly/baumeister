
export default {
  name: 'loco',
  modified: new Date(),
  plugins: {
    'git-provider': {
      cache: true,
      repo: 'https://github.com/notablemind/loco',
    },
    'shell-tester': {
      command: 'pwd; ls; npm test',
    },
  },
  builder: {
    id: 'docker',
    config: {
      prefab: 'docker-ci/component',
    },
  },
}

