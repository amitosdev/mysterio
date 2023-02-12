/* eslint-env jest */
const getSecretsClient = require('../lib/get-secrets-client')

const mockClient = {
  send() {
    return Promise.resolve({
      SecretString: JSON.stringify({ fooSecret: 'bar' })
    })
  }
}

describe('Get Secrets Client', () => {
  test('get secrets with default configuration', async () => {
    const client = getSecretsClient(null, mockClient)
    const secrets = await client()
    expect(secrets).toEqual({ fooSecret: 'bar' })
  })
})
