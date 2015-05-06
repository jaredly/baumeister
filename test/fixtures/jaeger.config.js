
import path from 'path'

export default {
  name: 'Jaeger',
  modified: new Date(),
  "builder": {
    "id": "local",
  },
  "plugins": {
    "local-provider": {
      "path": path.join(__dirname, '../../'),
      "inPlace": true
    },
    "shell-tester": {
      "docker": {
        "image": "jaeger/node"
      },
      "cwd": "",
      "command": "NODOCKER=1 make test"
    }
  }
}

