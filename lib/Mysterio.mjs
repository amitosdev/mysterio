import path from 'node:path'
import createDebug from 'debug'
import { unflatten as unflattenKeys } from 'flat'
import merge from 'lodash.merge'
import { getAwsSecretsClient } from './get-aws-secrets-client.mjs'
import { getConfigsFromFile } from './get-configs-from-file.mjs'
import { getEnv } from './get-env.mjs'
import { getPackageName } from './get-package-name.mjs'

const debug = createDebug('Mysterio:main')

const DEFAULT_MERGING_ORDER = ['default', 'env', 'secrets', 'rc']

export class Mysterio {
  #client
  #configDirPath
  #localRcPath
  #secretName
  #env

  constructor({
    configDirPath = path.join(process.cwd(), 'config'),
    localRcPath = path.join(process.cwd(), '.mysteriorc'),
    secretName,
    env,
    awsParams,
    client = getAwsSecretsClient(awsParams)
  } = {}) {
    this.#client = client
    this.#secretName = secretName
    this.#env = getEnv(env)
    this.#configDirPath = configDirPath
    this.#localRcPath = localRcPath

    debug(`constructor -> secretName "${this.#secretName}"`)
    debug(`constructor -> configDirPath "${this.#configDirPath}"`)
    debug(`constructor -> localRcPath "${this.#localRcPath}"`)
  }

  async getDefaultConfig() {
    const defaultPath = path.join(this.#configDirPath, 'default.json')
    const config = await getConfigsFromFile(defaultPath)
    debug('getDefaultConfig -> config:', config)
    return config
  }

  async getEnvConfigs() {
    const envPath = path.join(this.#configDirPath, `${this.#env}.json`)
    const config = await getConfigsFromFile(envPath)
    debug(`getEnvConfigs -> config for env "${this.#env}":`, config)
    return config
  }

  async getRcConfigs() {
    const config = await getConfigsFromFile(this.#localRcPath)
    debug('getRcConfigs -> config:', config)
    return config
  }

  async getSecrets(unflatten = false) {
    let secrets
    if (this.#secretName) {
      debug(`getSecrets -> fetching secrets for: ${this.#secretName}`)
      secrets = await this.#client(this.#secretName)
    } else {
      const pkgName = await getPackageName()
      const secretName = `${pkgName}/${this.#env}`
      debug(`getSecrets -> fetching secrets for: ${secretName}`)
      secrets = await this.#client(secretName)
    }
    return unflatten ? unflattenKeys(secrets) : secrets
  }

  async getMerged(mergingOrder = DEFAULT_MERGING_ORDER, unflattenSecrets = true) {
    debug(`getMerged -> called with mergingOrder: ${JSON.stringify(mergingOrder)}`)

    // Validate all sources in mergingOrder
    for (const source of mergingOrder) {
      if (!DEFAULT_MERGING_ORDER.includes(source)) {
        throw new Error(
          `Invalid source "${source}" in mergingOrder. Valid sources are: ${DEFAULT_MERGING_ORDER.join(', ')}`
        )
      }
    }

    const sourceGetters = {
      default: () => this.getDefaultConfig(),
      env: () => this.getEnvConfigs(),
      secrets: () => this.getSecrets(unflattenSecrets),
      rc: () => this.getRcConfigs()
    }

    const configPromises = mergingOrder.map((source) => {
      debug(`getMerged -> fetching source: ${source}`)
      return sourceGetters[source]()
    })

    const configs = await Promise.all(configPromises)

    const mergeArgs = [{}].concat(configs)

    // Deep merge all configurations in the order they were requested
    const merged = merge(...mergeArgs)
    debug('getMerged -> merged configurations', merged)

    return merged
  }
}
