import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager'
import createDebug from 'debug'

const debug = createDebug('Mysterio:get-secrets')

export const getSecretsClient = (
  awsParams = { region: 'us-east-1' },
  _client = new SecretsManagerClient(awsParams)
) => {
  return async (secretName) => {
    const secretParams = { SecretId: secretName }
    debug(`going to get secrets for "${JSON.stringify(secretParams)}"`)
    const { SecretString } = await _client.send(new GetSecretValueCommand(secretParams))
    debug('client response: ', SecretString)
    return JSON.parse(SecretString)
  }
}
