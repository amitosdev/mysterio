import test from 'ava'
import { getSecretsClient } from '../lib/get-secrets-client.mjs'

const mockClient = {
  send() {
    return Promise.resolve({
      SecretString: JSON.stringify({ fooSecret: 'bar' })
    })
  }
}

test('get secrets with default configuration', async (t) => {
  const client = getSecretsClient(null, mockClient)
  const secrets = await client()
  t.deepEqual(secrets, { fooSecret: 'bar' })
})
