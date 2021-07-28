const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager')
const fs = require('fs/promises')
const merge = require('lodash.merge')
const capitalize = require('lodash.capitalize')
const isString = require('lodash.isstring')
const debug = require('debug')('Enconsec')
const path = require('path')

class Enconsec {
  constructor({
    awsParams = { region: 'us-east-1' },
    configDirPath = path.join(process.cwd(), 'config'),
    localRCPath =  path.join(process.cwd(), '.enconsecrc'),
    env = process.env.NODE_ENV || 'local',
    packageName,
    secretName,
    _client
  } = {}) {
    this._client = _client || new SecretsManagerClient(awsParams)
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
    for (let i = 0; i < configFiles.length; i++) {
      const configFile = configFiles[i]
      const fileName = configFile.split('.')[0]
      if ([this.env, 'default'].includes(fileName)) {
        debug('getDefaultConfigs -> config file assigned: ', fileName)
        const configFileContent = await fs.readFile(path.join(this._configDirPath, configFile), 'utf-8')
        debug('getDefaultConfigs -> config file content: ', configFileContent.toString())
        Object.assign(result, JSON.parse(configFileContent.toString()))
      }
    }
    if (Object.keys(result).length) return result
    throw new Error(`missing configuration file in ${this._configDirPath} for "${this.env}" env`)
  }

  async getSecrets() {
    const secretParams = { SecretId: this._secretName }
    debug(`getSecrets -> going to get secrets for "${JSON.stringify(secretParams)}"`)
    const { SecretString } = await this._client.send(new GetSecretValueCommand(secretParams))
    debug('getSecrets -> client response: ', SecretString)
    return JSON.parse(SecretString)
  }

  async getLocalRC() {
    try {
      const localRc = await fs.readFile(this._localRcPath, 'utf-8')
      debug('getLocalRC -> file found: ', localRc.toString())
      return JSON.parse(localRc.toString())
    } catch (e) {
      debug(`getLocalRC -> error: `, e)
      return {}
    }
  }

  async getMerged({
    isAddEnvProp = false,
    isGetLocal = true
  } = {}) {
    debug(`getMerged -> called with isAddEnvProp="${isAddEnvProp}" and isGetLocal="${isGetLocal}"`)
    const defaultConfigs = await this.getDefaultConfigs()
    const secrets = !isGetLocal && this.env === 'local' ? {} : await this.getSecrets()
    const envProp = isAddEnvProp ? { [`is${capitalize(this.env)}`]: true } : {}
    const localRC = await this.getLocalRC()
    const merged = merge(defaultConfigs, secrets, envProp, localRC)
    debug('getMerged -> merged configurations', merged)
    return merged
  }
}

module.exports = Enconsec
