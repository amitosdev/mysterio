const {
  SecretsManagerClient,
  GetSecretValueCommand
} = require('@aws-sdk/client-secrets-manager')

const debug = require('debug')('Mysterio:get-secrets')

module.exports = (awsParams = { region: 'us-east-1' }, _client) => {
  const client = _client || new SecretsManagerClient(awsParams)
  return async (secretName) => {
    const secretParams = { SecretId: secretName }
    debug(`going to get secrets for "${JSON.stringify(secretParams)}"`)
    const { SecretString } = await client.send(
      new GetSecretValueCommand(secretParams)
    )
    debug('client response: ', SecretString)
    return JSON.parse(SecretString)
  }
}
