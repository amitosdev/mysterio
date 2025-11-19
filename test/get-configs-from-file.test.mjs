import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'ava'
import { getConfigsFromFile } from '../lib/get-configs-from-file.mjs'

// Helper to create temp directory with test files
async function setupTestDir(t) {
  const tempDir = path.join(tmpdir(), `mysterio-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  // Create directory
  await fs.mkdir(tempDir, { recursive: true })

  // Clean up after test
  t.teardown(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  return { tempDir }
}

test('getConfigsFromFile() - returns config object from valid JSON file', async (t) => {
  const { tempDir } = await setupTestDir(t)
  const configPath = path.join(tempDir, 'config.json')
  const configData = { foo: 'bar', baz: 123 }

  await fs.writeFile(configPath, JSON.stringify(configData))

  const result = await getConfigsFromFile(configPath)
  t.deepEqual(result, configData)
})

test('getConfigsFromFile() - returns empty object when file does not exist', async (t) => {
  const { tempDir } = await setupTestDir(t)
  const nonExistentPath = path.join(tempDir, 'non-existent.json')

  const result = await getConfigsFromFile(nonExistentPath)
  t.deepEqual(result, {})
})

test('getConfigsFromFile() - throws error for invalid JSON', async (t) => {
  const { tempDir } = await setupTestDir(t)
  const invalidJsonPath = path.join(tempDir, 'invalid.json')

  await fs.writeFile(invalidJsonPath, '{ "invalid": json }')

  await t.throwsAsync(
    getConfigsFromFile(invalidJsonPath),
    { instanceOf: SyntaxError },
    'Should throw SyntaxError for invalid JSON'
  )
})

test('getConfigsFromFile() - handles complex nested JSON objects', async (t) => {
  const { tempDir } = await setupTestDir(t)
  const configPath = path.join(tempDir, 'complex.json')
  const complexData = {
    database: {
      host: 'localhost',
      port: 5432,
      credentials: {
        user: 'admin',
        password: 'secret'
      }
    },
    features: ['feature1', 'feature2'],
    enabled: true
  }

  await fs.writeFile(configPath, JSON.stringify(complexData))

  const result = await getConfigsFromFile(configPath)
  t.deepEqual(result, complexData)
})

test('getConfigsFromFile() - handles empty JSON object', async (t) => {
  const { tempDir } = await setupTestDir(t)
  const configPath = path.join(tempDir, 'empty.json')

  await fs.writeFile(configPath, '{}')

  const result = await getConfigsFromFile(configPath)
  t.deepEqual(result, {})
})

test('getConfigsFromFile() - handles JSON with special characters', async (t) => {
  const { tempDir } = await setupTestDir(t)
  const configPath = path.join(tempDir, 'special.json')
  const specialData = {
    message: 'Hello "World"',
    path: '/path/to\\file',
    emoji: '🚀'
  }

  await fs.writeFile(configPath, JSON.stringify(specialData))

  const result = await getConfigsFromFile(configPath)
  t.deepEqual(result, specialData)
})

test('getConfigsFromFile() - handles JSON arrays', async (t) => {
  const { tempDir } = await setupTestDir(t)
  const configPath = path.join(tempDir, 'array.json')
  const arrayData = [1, 2, 3, { nested: 'object' }]

  await fs.writeFile(configPath, JSON.stringify(arrayData))

  const result = await getConfigsFromFile(configPath)
  t.deepEqual(result, arrayData)
})
