/* eslint-env jest */
const Mysterio = require('./Mysterio')
const mockFs = require('mock-fs')



const mockClient = {
  send() {
    return Promise.resolve({ SecretString: JSON.stringify({ fooSecret: 'bar' }) })
  }
}

describe('Mysterio', () => {
  beforeEach(() => {
    mockFs({
      'path/to/fake/dir/config': {
        'default.json': JSON.stringify({ fooDefault: 123 }),
        'local.json': JSON.stringify({ fooLocal: 123 }),
        'dev.json': JSON.stringify({ fooDev: 456 })
      },
      'fake': {
        '.mysteriorc': JSON.stringify({ fooRc: 789 })
      }
    })
  })
  afterEach(() => {
    mockFs.restore()
  })
  describe('getDefaultConfigs()', () => {
    test('only default config file', async () => {
      process.env.NODE_ENV = 'test'
      const mysterio = new Mysterio({ packageName: 'my-test-package', configDirPath: 'path/to/fake/dir/config', _client: mockClient })
      const defaultConfigs = await mysterio.getDefaultConfigs()
      expect(defaultConfigs).toEqual({ fooDefault: 123 })
    })
    test('with local env file', async () => {
      process.env.NODE_ENV = 'local'
      const mysterio = new Mysterio({ packageName: 'my-test-package', configDirPath: 'path/to/fake/dir/config', _client: mockClient })
      const defaultConfigs = await mysterio.getDefaultConfigs()
      expect(defaultConfigs).toEqual({ fooDefault: 123, fooLocal: 123 })
    })
  })
  describe('getSecrets()', () => {
    test('get secrets from AWS secretManager', async () => {
      process.env.NODE_ENV = 'test'
      const mysterio = new Mysterio({ packageName: 'my-test-package', configDirPath: 'path/to/fake/dir/config', _client: mockClient })
      const secrets = await mysterio.getSecrets()
      expect(secrets).toEqual({ fooSecret: 'bar' })
    })
  })
  describe('getLocalRC()', () => {
    test('only default config file', async () => {
      process.env.NODE_ENV = 'test'
      const mysterio = new Mysterio({ packageName: 'my-test-package', configDirPath: 'path/to/fake/dir/config', _client: mockClient, localRCPath: 'fake/.mysteriorc' })
      const rcConfigs = await mysterio.getLocalRC()
      expect(rcConfigs).toEqual({ fooRc: 789 })
    })
  })
  describe('getMerged()', () => {
    test('only default config file', async () => {
      process.env.NODE_ENV = 'test'
      const mysterio = new Mysterio({ packageName: 'my-test-package', configDirPath: 'path/to/fake/dir/config', _client: mockClient })
      const configs = await mysterio.getMerged()
      expect(configs).toEqual({ fooDefault: 123, fooSecret: 'bar' })
    })
    test('with local env file', async () => {
      process.env.NODE_ENV = 'local'
      const mysterio = new Mysterio({ packageName: 'my-test-package', configDirPath: 'path/to/fake/dir/config', _client: mockClient })
      const defaultConfigs = await mysterio.getMerged()
      expect(defaultConfigs).toEqual({ fooDefault: 123, fooLocal: 123, fooSecret: 'bar' })
    })
    test('with local env file and rc', async () => {
      process.env.NODE_ENV = 'local'
      const mysterio = new Mysterio({ packageName: 'my-test-package', configDirPath: 'path/to/fake/dir/config', _client: mockClient, localRCPath: 'fake/.mysteriorc' })
      const defaultConfigs = await mysterio.getMerged()
      expect(defaultConfigs).toEqual({ fooDefault: 123, fooLocal: 123, fooSecret: 'bar', fooRc: 789 })
    })
  })
})
