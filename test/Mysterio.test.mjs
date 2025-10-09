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
test('getSecrets() - uses provided secretName', async (t) => {
  const { configDir } = await setupTestDir(t)

  const mysterio = new Mysterio({
    configDirPath: configDir,
    secretName: 'custom-secret',
    client: mockClient
  })

  const secrets = await mysterio.getSecrets()
  t.deepEqual(secrets, { customSecret: 'custom-value' })
})

// ===========================================
// getMerged() tests
// ===========================================
test('getMerged() - merges in default order', async (t) => {
  const { tempDir, configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    configDirPath: configDir,
    secretName: 'test-secret',
    client: mockClient,
    localRcPath: path.join(tempDir, '.mysteriorc')
  })

  const merged = await mysterio.getMerged()
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

test('getMerged() - merges with custom order', async (t) => {
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
  const merged = await mysterio.getMerged(['default', 'env', 'rc', 'secrets'])
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

test('getMerged() - works with partial order', async (t) => {
  const { configDir } = await setupTestDir(t)
  const originalNodeEnv = process.env.NODE_ENV
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    configDirPath: configDir,
    client: mockClient
  })

  // Only get default and env configs
  const merged = await mysterio.getMerged(['default', 'env'])
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

test('getMerged() - handles missing config files gracefully', async (t) => {
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

  const merged = await mysterio.getMerged()
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
