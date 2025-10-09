import fs from 'node:fs/promises'
import path from 'node:path'
import createDebug from 'debug'

const debug = createDebug('Mysterio:get-package-name')

export async function getPackageName() {
  const packageJsonPath = path.join(process.cwd(), 'package.json')

  const packageJsonContent = await fs.readFile(packageJsonPath, 'utf-8')
  const packageJson = JSON.parse(packageJsonContent)

  debug(`Found package name: ${packageJson.name}`)
  return packageJson.name
}
