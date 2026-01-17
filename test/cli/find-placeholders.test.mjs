import test from 'ava'
import { findPlaceholders } from '../../cli/utils/find-placeholders.mjs'

test('findPlaceholders() - finds single placeholder at root level', (t) => {
  const config = {
    password: '<aws_secret_manager>'
  }

  const result = findPlaceholders(config)
  t.deepEqual(result, ['password'])
})

test('findPlaceholders() - finds multiple placeholders at root level', (t) => {
  const config = {
    password: '<aws_secret_manager>',
    apiKey: '<aws_secret_manager>',
    host: 'localhost'
  }

  const result = findPlaceholders(config)
  t.deepEqual(result, ['password', 'apiKey'])
})

test('findPlaceholders() - finds nested placeholders', (t) => {
  const config = {
    database: {
      password: '<aws_secret_manager>',
      username: '<aws_secret_manager>',
      host: 'localhost'
    }
  }

  const result = findPlaceholders(config)
  t.deepEqual(result, ['database.password', 'database.username'])
})

test('findPlaceholders() - finds deeply nested placeholders', (t) => {
  const config = {
    services: {
      api: {
        credentials: {
          secret: '<aws_secret_manager>'
        }
      }
    }
  }

  const result = findPlaceholders(config)
  t.deepEqual(result, ['services.api.credentials.secret'])
})

test('findPlaceholders() - returns empty array when no placeholders', (t) => {
  const config = {
    host: 'localhost',
    port: 3000
  }

  const result = findPlaceholders(config)
  t.deepEqual(result, [])
})

test('findPlaceholders() - ignores arrays', (t) => {
  const config = {
    hosts: ['host1', 'host2'],
    password: '<aws_secret_manager>'
  }

  const result = findPlaceholders(config)
  t.deepEqual(result, ['password'])
})

test('findPlaceholders() - ignores null values', (t) => {
  const config = {
    nullValue: null,
    password: '<aws_secret_manager>'
  }

  const result = findPlaceholders(config)
  t.deepEqual(result, ['password'])
})

test('findPlaceholders() - handles empty object', (t) => {
  const result = findPlaceholders({})
  t.deepEqual(result, [])
})

test('findPlaceholders() - handles mixed nesting levels', (t) => {
  const config = {
    rootSecret: '<aws_secret_manager>',
    database: {
      password: '<aws_secret_manager>',
      nested: {
        deep: {
          secret: '<aws_secret_manager>'
        }
      }
    },
    normalValue: 'not a secret'
  }

  const result = findPlaceholders(config)
  t.deepEqual(result, ['rootSecret', 'database.password', 'database.nested.deep.secret'])
})
