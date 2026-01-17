import fs from 'node:fs/promises'
import path from 'node:path'
import { getAwsSecretsClient } from '../../lib/get-aws-secrets-client.mjs'
import { getEnv } from '../../lib/get-env.mjs'
import { getPackageName } from '../../lib/get-package-name.mjs'
import { findPlaceholders } from '../utils/find-placeholders.mjs'

export async function compareSecret(options) {
  const { config: configPath, secret: secretName, env: envOption, region, output } = options

  try {
    const env = getEnv(envOption)

    // Default config path: ./config/{env}.json
    const resolvedConfigPath = configPath || path.join(process.cwd(), 'config', `${env}.json`)
    const absolutePath = path.resolve(resolvedConfigPath)
    const configContent = await fs.readFile(absolutePath, 'utf-8')
    const configObj = JSON.parse(configContent)

    const placeholders = findPlaceholders(configObj)

    if (placeholders.length === 0) {
      if (output === 'json') {
        console.log(JSON.stringify({ status: 'ok', message: 'No placeholders found in config', missing: [] }))
      } else {
        console.log('No <aws_secret_manager> placeholders found in config.')
      }
      return 0
    }

    // Default secret name: {packageName}/{env}
    let resolvedSecretName = secretName
    if (!resolvedSecretName) {
      const pkgName = await getPackageName()
      resolvedSecretName = `${pkgName}/${env}`
    }

    const client = getAwsSecretsClient({ region })
    const secretData = await client(resolvedSecretName)
    const secretKeys = new Set(Object.keys(secretData))

    const missing = placeholders.filter((key) => !secretKeys.has(key))

    if (missing.length === 0) {
      if (output === 'json') {
        console.log(JSON.stringify({ status: 'ok', message: 'All placeholders present in secret', missing: [] }))
      } else {
        console.log('All placeholders are present in the AWS secret.')
      }
      return 0
    }

    if (output === 'json') {
      console.log(JSON.stringify({ status: 'missing', message: `${missing.length} placeholder(s) missing`, missing }))
    } else {
      console.log(`Missing keys in AWS secret "${resolvedSecretName}":`)
      for (const key of missing) {
        console.log(`  - ${key}`)
      }
    }
    return 1
  } catch (err) {
    if (output === 'json') {
      console.log(JSON.stringify({ status: 'error', message: err.message, missing: [] }))
    } else {
      console.error(`Error: ${err.message}`)
    }
    return 2
  }
}
