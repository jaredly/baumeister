
export default {
  name: 'loco',
  modified: new Date(),
  builder: {
    id: 'local',
  },
  plugins: {
    'git-provider': {
      cache: true,
      repo: 'https://github.com/notablemind/loco',
    },
    'npm-test': {},
    'npm-install': {},
  },
}

