import fs from 'node:fs/promises'
import path from 'node:path'
import { getEnv } from '../../lib/get-env.mjs'
import { findPlaceholders } from '../utils/find-placeholders.mjs'

export async function generateTemplate(options) {
  const { config: configPath, env: envOption, output: outputPath } = options

  try {
    const env = getEnv(envOption)

    // Default config path: ./config/{env}.json
    const resolvedConfigPath = configPath || path.join(process.cwd(), 'config', `${env}.json`)
    const absolutePath = path.resolve(resolvedConfigPath)
    const configContent = await fs.readFile(absolutePath, 'utf-8')
    const configObj = JSON.parse(configContent)

    const placeholders = findPlaceholders(configObj)

    if (placeholders.length === 0) {
      console.error('No <aws_secret_manager> placeholders found in config.')
      return 0
    }

    const template = {}
    for (const key of placeholders) {
      template[key] = 'replace_with_secret'
    }

    const jsonOutput = JSON.stringify(template, null, 2)

    if (outputPath) {
      const absoluteOutputPath = path.resolve(outputPath)
      await fs.writeFile(absoluteOutputPath, jsonOutput + '\n', 'utf-8')
      console.log(`Template written to: ${absoluteOutputPath}`)
    } else {
      console.log(jsonOutput)
    }

    return 0
  } catch (err) {
    console.error(`Error: ${err.message}`)
    return 2
  }
}
