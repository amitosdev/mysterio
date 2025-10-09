import fs from 'node:fs/promises'
import createDebug from 'debug'

const debug = createDebug('Mysterio:get-configs-from-file')

export async function getConfigsFromFile(filePath) {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8')
    debug(`File found: ${filePath}`)
    debug('File content: ', fileContent)
    return JSON.parse(fileContent)
  } catch (e) {
    if (e.code === 'ENOENT') {
      debug(`File not found: ${filePath}`)
      return {}
    }

    debug(`Error reading file ${filePath}: `, e)
    throw e
  }
}
