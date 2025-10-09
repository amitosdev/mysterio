import fs from 'node:fs/promises'
import path from 'node:path'
import createDebug from 'debug'
import capitalize from 'lodash.capitalize'
import isString from 'lodash.isstring'
import merge from 'lodash.merge'
import { getSecretsClient } from './get-secrets-client.mjs'

const debug = createDebug('Mysterio:main')

export class Mysterio {
  constructor({
    awsParams,
    configDirPath = path.join(process.cwd(), 'config'),
    localRCPath = path.join(process.cwd(), '.mysteriorc'),
    env = process.env.NODE_ENV || 'local',
    packageName,
    secretName,
    _client
  } = {}) {
    this._client = _client || getSecretsClient(awsParams)
    this._configDirPath = configDirPath
    this._localRcPath = localRCPath
    this.env = env
    if (!isString(packageName)) throw new Error('packageName must be String')
    this._secretName = secretName || `${packageName}/${env}`
    debug(`constructor -> env "${this.env}"`)
    debug(`constructor -> secretName "${this._secretName}"`)
    debug(`constructor -> configDirPath "${this._configDirPath}"`)
  }

  async getDefaultConfigs() {
    const configFiles = await fs.readdir(this._configDirPath)
    debug('getDefaultConfigs -> configFiles: ', configFiles)
    const result = {}
    for (const configFile of configFiles) {
      const fileName = configFile.split('.')[0]
      if ([this.env, 'default'].includes(fileName)) {
        debug('getDefaultConfigs -> config file assigned: ', fileName)
        const configFileContent = await fs.readFile(path.join(this._configDirPath, configFile), 'utf-8')
        debug('getDefaultConfigs -> config file content: ', configFileContent.toString())
        Object.assign(result, JSON.parse(configFileContent.toString()))
      }
    }
    if (Object.keys(result).length > 0) return result
    throw new Error(`missing configuration file in ${this._configDirPath} for "${this.env}" env`)
  }

  getSecrets() {
    return this._client(this._secretName)
  }

  async getLocalRC() {
    try {
      const localRc = await fs.readFile(this._localRcPath, 'utf-8')
      debug('getLocalRC -> file found: ', localRc.toString())
      return JSON.parse(localRc.toString())
    } catch (e) {
      debug('getLocalRC -> error: ', e)
      return {}
    }
  }

  async getMerged({ isAddEnvProp = false, isGetLocal = true, isGetTest = false } = {}) {
    debug(
      `getMerged -> called with isAddEnvProp="${isAddEnvProp}" and isGetLocal="${isGetLocal}" and isGetTest="${isGetTest}"`
    )
    const avoidLocal = !isGetLocal && this.env === 'local'
    const avoidTest = !isGetTest && this.env === 'test'
    const defaultConfigs = await this.getDefaultConfigs()
    const secrets = avoidLocal || avoidTest ? {} : await this.getSecrets()
    const envProp = isAddEnvProp ? { [`is${capitalize(this.env)}`]: true } : {}
    const localRc = await this.getLocalRC()
    const merged = merge(defaultConfigs, secrets, envProp, localRc)
    debug('getMerged -> merged configurations', merged)
    return merged
  }
}
