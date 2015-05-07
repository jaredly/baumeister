
import appConfig from '../../../config'

export default function getBlocks(section) {
  const blocks = []
  Object.keys(appConfig.plugins).forEach(name => {
    const plugin = appConfig.plugins[name]
    if (plugin.blocks && plugin.blocks[section]) {
      blocks.push({id: name, block: plugin.blocks[section]})
    }
  })
  return blocks
}

