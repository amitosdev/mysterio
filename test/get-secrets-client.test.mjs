import test from 'ava'
import { getAwsSecretsClient } from '../lib/get-aws-secrets-client.mjs'

const mockClient = {
  send() {
    return Promise.resolve({
      // biome-ignore lint/style/useNamingConvention : This is AWS SDK response
      SecretString: JSON.stringify({ fooSecret: 'bar' })
    })
  }
}

test('get secrets with default configuration', async (t) => {
  const client = getAwsSecretsClient(null, mockClient)
  const secrets = await client('test-secret')
  t.deepEqual(secrets, { fooSecret: 'bar' })
})
