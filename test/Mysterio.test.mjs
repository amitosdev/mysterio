import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'ava'
import { Mysterio } from '../lib/Mysterio.mjs'

const mockClient = () => Promise.resolve({ fooSecret: 'bar' })

// Helper to create temp directory with test files
async function setupTestDir(t) {
  const tempDir = path.join(tmpdir(), `mysterio-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const configDir = path.join(tempDir, 'config')

  // Create directories
  await fs.mkdir(configDir, { recursive: true })

  // Create config files
  await fs.writeFile(path.join(configDir, 'default.json'), JSON.stringify({ fooDefault: 123 }))
  await fs.writeFile(path.join(configDir, 'local.json'), JSON.stringify({ fooLocal: 123 }))
  await fs.writeFile(path.join(configDir, 'dev.json'), JSON.stringify({ fooDev: 456 }))
  await fs.writeFile(path.join(configDir, 'test.json'), JSON.stringify({ fooTest: 1011 }))

  // Create .mysteriorc file
  await fs.writeFile(path.join(tempDir, '.mysteriorc'), JSON.stringify({ fooRc: 789 }))

  // Clean up after test
  t.teardown(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  return { tempDir, configDir }
}

// getDefaultConfigs() tests
test('getDefaultConfigs() - only default config file', async (t) => {
  const { configDir } = await setupTestDir(t)
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    packageName: 'my-test-package',
    configDirPath: configDir,
    _client: mockClient
  })

  const defaultConfigs = await mysterio.getDefaultConfigs()
  t.deepEqual(defaultConfigs, { fooDefault: 123, fooTest: 1011 })
})

test('getDefaultConfigs() - with local env file', async (t) => {
  const { configDir } = await setupTestDir(t)
  process.env.NODE_ENV = 'local'

  const mysterio = new Mysterio({
    packageName: 'my-test-package',
    configDirPath: configDir,
    _client: mockClient
  })

  const defaultConfigs = await mysterio.getDefaultConfigs()
  t.deepEqual(defaultConfigs, { fooDefault: 123, fooLocal: 123 })
})

// getSecrets() tests
test('getSecrets() - get secrets from AWS secretManager', async (t) => {
  const { configDir } = await setupTestDir(t)
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    packageName: 'my-test-package',
    configDirPath: configDir,
    _client: mockClient
  })

  const secrets = await mysterio.getSecrets()
  t.deepEqual(secrets, { fooSecret: 'bar' })
})

// getLocalRC() tests
test('getLocalRC() - only default config file', async (t) => {
  const { tempDir, configDir } = await setupTestDir(t)
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    packageName: 'my-test-package',
    configDirPath: configDir,
    _client: mockClient,
    localRCPath: path.join(tempDir, '.mysteriorc')
  })

  const rcConfigs = await mysterio.getLocalRC()
  t.deepEqual(rcConfigs, { fooRc: 789 })
})

// getMerged() tests
test('getMerged() - only default config file', async (t) => {
  const { configDir } = await setupTestDir(t)
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    packageName: 'my-test-package',
    configDirPath: configDir,
    _client: mockClient
  })

  const configs = await mysterio.getMerged({ isGetTest: true })
  t.deepEqual(configs, {
    fooDefault: 123,
    fooTest: 1011,
    fooSecret: 'bar'
  })
})

test('getMerged() - with local env file', async (t) => {
  const { configDir } = await setupTestDir(t)
  process.env.NODE_ENV = 'local'

  const mysterio = new Mysterio({
    packageName: 'my-test-package',
    configDirPath: configDir,
    _client: mockClient
  })

  const defaultConfigs = await mysterio.getMerged()
  t.deepEqual(defaultConfigs, {
    fooDefault: 123,
    fooLocal: 123,
    fooSecret: 'bar'
  })
})

test('getMerged() - with local env file - but isGetLocal false', async (t) => {
  const { configDir } = await setupTestDir(t)
  process.env.NODE_ENV = 'local'

  const mysterio = new Mysterio({
    packageName: 'my-test-package',
    configDirPath: configDir,
    _client: mockClient
  })

  const defaultConfigs = await mysterio.getMerged({ isGetLocal: false })
  t.deepEqual(defaultConfigs, {
    fooDefault: 123,
    fooLocal: 123
  })
})

test('getMerged() - with test env file - but isGetTest false', async (t) => {
  const { configDir } = await setupTestDir(t)
  process.env.NODE_ENV = 'test'

  const mysterio = new Mysterio({
    packageName: 'my-test-package',
    configDirPath: configDir,
    _client: mockClient
  })

  const defaultConfigs = await mysterio.getMerged({ isGetTest: false })
  t.deepEqual(defaultConfigs, {
    fooDefault: 123,
    fooTest: 1011
  })
})

test('getMerged() - with local env file and rc', async (t) => {
  const { tempDir, configDir } = await setupTestDir(t)
  process.env.NODE_ENV = 'local'

  const mysterio = new Mysterio({
    packageName: 'my-test-package',
    configDirPath: configDir,
    _client: mockClient,
    localRCPath: path.join(tempDir, '.mysteriorc')
  })

  const defaultConfigs = await mysterio.getMerged()
  t.deepEqual(defaultConfigs, {
    fooDefault: 123,
    fooLocal: 123,
    fooSecret: 'bar',
    fooRc: 789
  })
})
