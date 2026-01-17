import fs from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'ava'
import { generateTemplate } from '../../cli/commands/generate-template.mjs'

async function setupTestConfig(t, config) {
  const tempDir = path.join(tmpdir(), `mysterio-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  await fs.mkdir(tempDir, { recursive: true })

  const configPath = path.join(tempDir, 'config.json')
  await fs.writeFile(configPath, JSON.stringify(config))

  t.teardown(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  return { tempDir, configPath }
}

// Tests that modify console must run serially
test.serial('generateTemplate() - generates template from config with placeholders', async (t) => {
  const config = {
    database: {
      password: '<aws_secret_manager>',
      username: '<aws_secret_manager>'
    },
    apiKey: '<aws_secret_manager>'
  }

  const { configPath, tempDir } = await setupTestConfig(t, config)
  const outputPath = path.join(tempDir, 'template.json')

  // Suppress console for this test
  const originalLog = console.log
  console.log = () => {}

  const exitCode = await generateTemplate({ config: configPath, output: outputPath })

  console.log = originalLog

  t.is(exitCode, 0)

  const templateContent = await fs.readFile(outputPath, 'utf-8')
  const template = JSON.parse(templateContent)

  t.deepEqual(template, {
    'database.password': 'replace_with_secret',
    'database.username': 'replace_with_secret',
    apiKey: 'replace_with_secret'
  })
})

test.serial('generateTemplate() - outputs to stdout when no output path specified', async (t) => {
  const config = {
    secret: '<aws_secret_manager>'
  }

  const { configPath } = await setupTestConfig(t, config)

  // Capture console output
  const originalLog = console.log
  let output = ''
  console.log = (msg) => {
    output += msg
  }

  const exitCode = await generateTemplate({ config: configPath })

  console.log = originalLog

  t.is(exitCode, 0)

  const template = JSON.parse(output)
  t.deepEqual(template, {
    secret: 'replace_with_secret'
  })
})

test.serial('generateTemplate() - returns 0 when no placeholders found', async (t) => {
  const config = {
    host: 'localhost',
    port: 3000
  }

  const { configPath } = await setupTestConfig(t, config)

  // Suppress console.error for this test
  const originalError = console.error
  console.error = () => {}

  const exitCode = await generateTemplate({ config: configPath })

  console.error = originalError

  t.is(exitCode, 0)
})

test.serial('generateTemplate() - returns 2 on file read error', async (t) => {
  // Suppress console.error for this test
  const originalError = console.error
  console.error = () => {}

  const exitCode = await generateTemplate({ config: '/non/existent/path.json' })

  console.error = originalError

  t.is(exitCode, 2)
})

test.serial('generateTemplate() - returns 2 on invalid JSON', async (t) => {
  const tempDir = path.join(tmpdir(), `mysterio-cli-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  await fs.mkdir(tempDir, { recursive: true })

  const configPath = path.join(tempDir, 'invalid.json')
  await fs.writeFile(configPath, '{ invalid json }')

  t.teardown(async () => {
    await fs.rm(tempDir, { recursive: true, force: true })
  })

  // Suppress console.error for this test
  const originalError = console.error
  console.error = () => {}

  const exitCode = await generateTemplate({ config: configPath })

  console.error = originalError

  t.is(exitCode, 2)
})
