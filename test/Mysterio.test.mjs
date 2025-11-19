import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'ava'
import { Mysterio } from '../lib/Mysterio.mjs'

const mockClient = (secretName) => {
  // Mock different responses based on secret name
  if (secretName === 'custom-secret') {
    return Promise.resolve({ customSecret: 'custom-value' })
  }
  if (secretName === 'nested-secret') {
    return Promise.resolve({ 'foo.bar': 'nested-value', 'foo.baz': 123, top: 'level' })
  }
  if (secretName === 'regular-json-secret') {
    // Regular nested JSON without dotted keys
    return Promise.resolve({
      database: {
        host: 'secret-host',
        password: 'secret-password'
      },
      apiKey: 'secret-api-key'
    })
  }
  if (secretName === 'test-package/test') {
    return Promise.resolve({ packageSecret: 'from-package-name' })
  }
  if (secretName === 'test-package/local') {
    return Promise.resolve({ localPackageSecret: 'value' })
  }
  return Promise.resolve({ fooSecret: 'bar' })
}

// Helper to create temp directory with test files
async function setupTestDir(t) {
  const tempDir = path.join(tmpdir(), `mysterio-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const configDir = path.join(tempDir, 'config')

  // Create directories
  await fs.mkdir(configDir, { recursive: true })

  // Create config files
  await fs.writeFile(path.join(configDir, 'default.json'), JSON.stringify({ fooDefault: 123, commonKey: 'default' }))
  await fs.writeFile(path.join(configDir, 'local.json'), JSON.stringify({ fooLocal: 123, commonKey: 'local' }))
  await fs.writeFile(path.join(configDir, 'dev.json'), JSON.stringify({ fooDev: 456, commonKey: 'dev' }))
  await fs.writeFile(path.join(configDir, 'test.json'), JSON.stringify({ fooTest: 1011, commonKey: 'test' }))

  // Create .mysteriorc file
  await fs.writeFile(path.join(tempDir, '.mysteriorc'), JSON.stringify({ fooRc: 789, commonKey: 'rc' }))

  // Create a package.json file for testing package name extraction
  await fs.writeFile(path.join(tempDir, 'package.json'), JSON.stringify({ name: 'test-package', version: '1.0.0' }))

  // Clean up after test
  t.teardown(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  return { tempDir, configDir }
}

// ===========================================
// getDefaultConfig() tests
// ===========================================
test('getDefaultConfig() - returns default config file content', async (t) => {
  const { configDir } = await setupTestDir(t)

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient
  })

  const defaultConfig = await mysterio.getDefaultConfig()
  t.deepEqual(defaultConfig, { fooDefault: 123, commonKey: 'default' })
})

test('getDefaultConfig() - returns empty object when default.json does not exist', async (t) => {
  const { tempDir } = await setupTestDir(t)
  const emptyConfigDir = path.join(tempDir, 'empty-config')
  await fs.mkdir(emptyConfigDir)

  const mysterio = new Mysterio({
    configDirPath: emptyConfigDir,
    client: mockClient
  })

  const defaultConfig = await mysterio.getDefaultConfig()
  t.deepEqual(defaultConfig, {})
})

// ===========================================
// getEnvConfigs() tests
// ===========================================
test('getEnvConfigs() - returns test environment config', async (t) => {
  const { configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient
  })

  const envConfig = await mysterio.getEnvConfigs()
  t.deepEqual(envConfig, { fooTest: 1011, commonKey: 'test' })

  // Restore original NODE_ENV
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})

test('getEnvConfigs() - returns local environment config when NODE_ENV is not set', async (t) => {
  const { configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  delete process.env.NODE_ENV

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient
  })

  const envConfig = await mysterio.getEnvConfigs()
  t.deepEqual(envConfig, { fooLocal: 123, commonKey: 'local' })

  // Restore original NODE_ENV
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  }
})

test('getEnvConfigs() - returns dev environment config', async (t) => {
  const { configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'dev'

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient
  })

  const envConfig = await mysterio.getEnvConfigs()
  t.deepEqual(envConfig, { fooDev: 456, commonKey: 'dev' })

  // Restore original NODE_ENV
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})

test('getEnvConfigs() - uses env from constructor instead of NODE_ENV', async (t) => {
  const { configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient,
    env: 'dev'
  })

  const envConfig = await mysterio.getEnvConfigs()
  t.deepEqual(envConfig, { fooDev: 456, commonKey: 'dev' })

  // Restore original NODE_ENV
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})

test('getEnvConfigs() - env constructor param overrides undefined NODE_ENV', async (t) => {
  const { configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  delete process.env.NODE_ENV

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient,
    env: 'test'
  })

  const envConfig = await mysterio.getEnvConfigs()
  t.deepEqual(envConfig, { fooTest: 1011, commonKey: 'test' })

  // Restore original NODE_ENV
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  }
})

// ===========================================
// getRcConfigs() tests
// ===========================================
test('getRcConfigs() - returns config when file exists', async (t) => {
  const { tempDir, configDir } = await setupTestDir(t)

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient,
    localRcPath: path.join(tempDir, '.mysteriorc')
  })

  const rcConfigs = await mysterio.getRcConfigs()
  t.deepEqual(rcConfigs, { fooRc: 789, commonKey: 'rc' })
})

test('getRcConfigs() - returns empty object when file does not exist', async (t) => {
  const { configDir } = await setupTestDir(t)

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient,
    localRcPath: path.join(configDir, 'non-existent-file.json')
  })

  const rcConfigs = await mysterio.getRcConfigs()
  t.deepEqual(rcConfigs, {})
})

test('getRcConfigs() - throws error for invalid JSON', async (t) => {
  const { tempDir, configDir } = await setupTestDir(t)

  // Create a file with invalid JSON
  const invalidJsonPath = path.join(tempDir, 'invalid.json')
  await fs.writeFile(invalidJsonPath, '{ "invalid": json }')

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient,
    localRcPath: invalidJsonPath
  })

  await t.throwsAsync(mysterio.getRcConfigs(), { instanceOf: SyntaxError }, 'Should throw SyntaxError for invalid JSON')
})

// ===========================================
// getSecrets() tests
// ===========================================
test('getSecrets() - uses provided secretName with unflatten=false', async (t) => {
  const { configDir } = await setupTestDir(t)

  const mysterio = new Mysterio({
    configDirPath: configDir,
    secretName: 'custom-secret',
    client: mockClient
  })

  const secrets = await mysterio.getSecrets(false)
  t.deepEqual(secrets, { customSecret: 'custom-value' })
})

test('getSecrets() - with unflatten=true converts dotted keys to nested objects', async (t) => {
  const { configDir } = await setupTestDir(t)

  const mysterio = new Mysterio({
    configDirPath: configDir,
    secretName: 'nested-secret',
    client: mockClient
  })

  const secrets = await mysterio.getSecrets(true)
  t.deepEqual(secrets, {
    foo: {
      bar: 'nested-value',
      baz: 123
    },
    top: 'level'
  })
})

test('getSecrets() - with unflatten=false keeps dotted keys as is', async (t) => {
  const { configDir } = await setupTestDir(t)

  const mysterio = new Mysterio({
    configDirPath: configDir,
    secretName: 'nested-secret',
    client: mockClient
  })

  const secrets = await mysterio.getSecrets(false)
  t.deepEqual(secrets, {
    'foo.bar': 'nested-value',
    'foo.baz': 123,
    top: 'level'
  })
})

test('getSecrets() - uses env from constructor for secretName generation', async (t) => {
  const { configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'

  // Track what secret name the client receives
  let capturedSecretName
  const spyClient = (secretName) => {
    capturedSecretName = secretName
    return mockClient(secretName)
  }

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: spyClient,
    env: 'test'
  })

  await mysterio.getSecrets(false)

  // Verify the secret name ends with /test (env from constructor)
  t.true(capturedSecretName.endsWith('/test'), `Expected secretName to end with /test, got: ${capturedSecretName}`)

  // Restore original NODE_ENV
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})

test('getSecrets() - env constructor param overrides NODE_ENV for secret name generation', async (t) => {
  const { configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  delete process.env.NODE_ENV

  // Track what secret name the client receives
  let capturedSecretName
  const spyClient = (secretName) => {
    capturedSecretName = secretName
    return mockClient(secretName)
  }

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: spyClient,
    env: 'local'
  })

  await mysterio.getSecrets(false)

  // Verify the secret name ends with /local (env from constructor)
  t.true(capturedSecretName.endsWith('/local'), `Expected secretName to end with /local, got: ${capturedSecretName}`)

  // Restore original NODE_ENV
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  }
})

// ===========================================
// getMerged() tests
// ===========================================
test('getMerged() - merges in default order with unflattenSecrets=false', async (t) => {
  const { tempDir, configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    configDirPath: configDir,
    secretName: 'test-secret',
    client: mockClient,
    localRcPath: path.join(tempDir, '.mysteriorc')
  })

  const merged = await mysterio.getMerged(['default', 'env', 'secrets', 'rc'], false)
  t.deepEqual(merged, {
    fooDefault: 123,
    fooTest: 1011,
    fooSecret: 'bar',
    fooRc: 789,
    commonKey: 'rc' // rc should override all others as it's last
  })

  // Restore
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})

test('getMerged() - merges with custom order and unflattenSecrets=false', async (t) => {
  const { tempDir, configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    configDirPath: configDir,
    secretName: 'test-secret',
    client: mockClient,
    localRcPath: path.join(tempDir, '.mysteriorc')
  })

  // Custom order: rc comes before secrets, so secrets should override rc
  const merged = await mysterio.getMerged(['default', 'env', 'rc', 'secrets'], false)
  t.deepEqual(merged, {
    fooDefault: 123,
    fooTest: 1011,
    fooRc: 789,
    fooSecret: 'bar',
    commonKey: 'rc' // rc overrides test, and secrets doesn't have commonKey so rc's value remains
  })

  // Restore
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})

test('getMerged() - works with partial order and unflattenSecrets=false', async (t) => {
  const { configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient
  })

  // Only get default and env configs
  const merged = await mysterio.getMerged(['default', 'env'], false)
  t.deepEqual(merged, {
    fooDefault: 123,
    fooTest: 1011,
    commonKey: 'test' // env overrides default
  })

  // Restore
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})

test('getMerged() - throws error for invalid source in order', async (t) => {
  const { configDir } = await setupTestDir(t)

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient
  })

  await t.throwsAsync(
    mysterio.getMerged(['default', 'invalid-source']),
    { message: /Invalid source "invalid-source"/ },
    'Should throw error for invalid source'
  )
})

test('getMerged() - handles missing config files gracefully with unflattenSecrets=false', async (t) => {
  const { tempDir } = await setupTestDir(t)
  const emptyConfigDir = path.join(tempDir, 'empty-config')
  await fs.mkdir(emptyConfigDir)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'production' // Environment that doesn't have a config file

  const mysterio = new Mysterio({
    configDirPath: emptyConfigDir,
    secretName: 'test-secret',
    client: mockClient,
    localRcPath: path.join(emptyConfigDir, 'non-existent.rc')
  })

  const merged = await mysterio.getMerged(['default', 'env', 'secrets', 'rc'], false)
  t.deepEqual(merged, {
    fooSecret: 'bar' // Only secrets should be present
  })

  // Restore
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})

test('getMerged() - preserves empty object prototype', async (t) => {
  const { configDir } = await setupTestDir(t)

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient
  })

  const merged = await mysterio.getMerged(['default'])

  // Check that the merged object doesn't have unexpected prototype pollution
  t.true(Object.getPrototypeOf(merged) === Object.prototype)
  t.deepEqual(merged, { fooDefault: 123, commonKey: 'default' })
})

// ===========================================
// getMerged() with unflattenSecrets=true tests
// ===========================================
test('getMerged() - with unflattenSecrets=true unflattens dotted secret keys', async (t) => {
  const { tempDir, configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    configDirPath: configDir,
    secretName: 'nested-secret',
    client: mockClient,
    localRcPath: path.join(tempDir, '.mysteriorc')
  })

  const merged = await mysterio.getMerged(['default', 'env', 'secrets', 'rc'], true)
  t.deepEqual(merged, {
    fooDefault: 123,
    fooTest: 1011,
    foo: {
      bar: 'nested-value',
      baz: 123
    },
    top: 'level',
    fooRc: 789,
    commonKey: 'rc'
  })

  // Restore
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})

test('getMerged() - with unflattenSecrets=true merges nested secrets with existing nested config', async (t) => {
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

  // Create a fresh temp directory specifically for this test to avoid race conditions
  const tempDir = path.join(tmpdir(), `mysterio-nested-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const configDir = path.join(tempDir, 'config')

  // Create directories
  await fs.mkdir(configDir, { recursive: true })

  // Create default config
  await fs.writeFile(path.join(configDir, 'default.json'), JSON.stringify({ fooDefault: 123, commonKey: 'default' }))

  // Create a test config file with nested structure matching the secret keys
  await fs.writeFile(
    path.join(configDir, 'test.json'),
    JSON.stringify({
      fooTest: 1011,
      commonKey: 'test',
      foo: {
        bar: 'original-bar',
        existing: 'value'
      }
    })
  )

  const mysterio = new Mysterio({
    configDirPath: configDir,
    secretName: 'nested-secret',
    client: mockClient,
    localRcPath: path.join(tempDir, '.mysteriorc')
  })

  const merged = await mysterio.getMerged(['default', 'env', 'secrets'], true)

  // Secrets should override the env config's nested values but preserve other nested keys
  t.deepEqual(merged, {
    fooDefault: 123,
    fooTest: 1011,
    foo: {
      bar: 'nested-value', // Overridden by secret
      baz: 123, // Added by secret
      existing: 'value' // Preserved from env config
    },
    top: 'level',
    commonKey: 'test'
  })

  // Clean up
  await fs.rm(tempDir, { recursive: true, force: true })

  // Restore
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})

test('getMerged() - with unflattenSecrets=true handles complex nested merging', async (t) => {
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

  // Create a fresh temp directory specifically for this test
  const tempDir = path.join(tmpdir(), `mysterio-complex-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const configDir = path.join(tempDir, 'config')

  // Create directories
  await fs.mkdir(configDir, { recursive: true })

  // Create complex nested config files
  await fs.writeFile(
    path.join(configDir, 'default.json'),
    JSON.stringify({
      database: {
        host: 'localhost',
        port: 5432,
        credentials: {
          username: 'default-user'
        }
      }
    })
  )

  await fs.writeFile(
    path.join(configDir, 'test.json'),
    JSON.stringify({
      database: {
        host: 'test-host',
        credentials: {
          username: 'test-user'
        }
      }
    })
  )

  // Mock client that returns dotted keys for database credentials
  const complexMockClient = () => {
    return Promise.resolve({
      'database.credentials.password': 'secret-password',
      'database.credentials.token': 'secret-token'
    })
  }

  const mysterio = new Mysterio({
    configDirPath: configDir,
    secretName: 'complex-secret',
    client: complexMockClient,
    localRcPath: path.join(tempDir, '.mysteriorc')
  })

  const merged = await mysterio.getMerged(['default', 'env', 'secrets'], true)

  t.deepEqual(merged, {
    database: {
      host: 'test-host', // From test config
      port: 5432, // From default config
      credentials: {
        username: 'test-user', // From test config
        password: 'secret-password', // From secrets (unflattened)
        token: 'secret-token' // From secrets (unflattened)
      }
    }
  })

  // Clean up
  await fs.rm(tempDir, { recursive: true, force: true })

  // Restore
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})

test('getMerged() - with unflattenSecrets=true is backward compatible with regular nested JSON', async (t) => {
  const { tempDir, configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    configDirPath: configDir,
    secretName: 'regular-json-secret',
    client: mockClient,
    localRcPath: path.join(tempDir, '.mysteriorc')
  })

  // Even with unflatten=true, regular nested JSON should remain unchanged
  const merged = await mysterio.getMerged(['default', 'env', 'secrets', 'rc'], true)

  t.deepEqual(merged, {
    fooDefault: 123,
    fooTest: 1011,
    fooRc: 789,
    database: {
      host: 'secret-host', // From secrets (already nested)
      password: 'secret-password' // From secrets (already nested)
    },
    apiKey: 'secret-api-key', // From secrets
    commonKey: 'rc'
  })

  // Restore
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv
  } else {
    delete process.env.NODE_ENV
  }
})
