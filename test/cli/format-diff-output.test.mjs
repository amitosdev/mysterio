import test from 'ava'
import { formatDiffOutput, hasDifferences } from '../../cli/utils/format-diff-output.mjs'

test('formatDiffOutput() - returns message when no differences', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'equal',
    diff: []
  }

  const result = formatDiffOutput(objectDiff)
  t.is(result, 'No differences found.')
})

test('formatDiffOutput() - formats added property', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'updated',
    diff: [
      {
        property: 'newKey',
        currentValue: 'newValue',
        status: 'added'
      }
    ]
  }

  const result = formatDiffOutput(objectDiff, 'staging', 'production')
  t.true(result.includes('property'))
  t.true(result.includes('staging'))
  t.true(result.includes('production'))
  t.true(result.includes('status'))
  t.true(result.includes('newKey'))
  t.true(result.includes('newValue'))
  t.true(result.includes('added'))
})

test('formatDiffOutput() - formats deleted property', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'updated',
    diff: [
      {
        property: 'removedKey',
        previousValue: 'oldValue',
        status: 'deleted'
      }
    ]
  }

  const result = formatDiffOutput(objectDiff)
  t.true(result.includes('removedKey'))
  t.true(result.includes('oldValue'))
  t.true(result.includes('deleted'))
})

test('formatDiffOutput() - formats updated property', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'updated',
    diff: [
      {
        property: 'changedKey',
        previousValue: 'oldValue',
        currentValue: 'newValue',
        status: 'updated'
      }
    ]
  }

  const result = formatDiffOutput(objectDiff)
  t.true(result.includes('changedKey'))
  t.true(result.includes('oldValue'))
  t.true(result.includes('newValue'))
  t.true(result.includes('updated'))
})

test('formatDiffOutput() - formats nested property with dot notation', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'updated',
    diff: [
      {
        property: 'database',
        previousValue: { port: 3000 },
        currentValue: { port: 8080 },
        status: 'updated',
        diff: [
          {
            property: 'port',
            previousValue: 3000,
            currentValue: 8080,
            status: 'updated'
          }
        ]
      }
    ]
  }

  const result = formatDiffOutput(objectDiff)
  t.true(result.includes('database.port'))
  t.true(result.includes('3000'))
  t.true(result.includes('8080'))
})

test('formatDiffOutput() - formats multiple differences', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'updated',
    diff: [
      {
        property: 'added',
        currentValue: 'new',
        status: 'added'
      },
      {
        property: 'removed',
        previousValue: 'old',
        status: 'deleted'
      },
      {
        property: 'changed',
        previousValue: 1,
        currentValue: 2,
        status: 'updated'
      }
    ]
  }

  const result = formatDiffOutput(objectDiff)
  t.true(result.includes('added'))
  t.true(result.includes('deleted'))
  t.true(result.includes('updated'))
})

test('formatDiffOutput() - handles null values', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'updated',
    diff: [
      {
        property: 'nullVal',
        currentValue: null,
        status: 'added'
      }
    ]
  }

  const result = formatDiffOutput(objectDiff)
  t.true(result.includes('nullVal'))
  t.true(result.includes('null'))
})

test('formatDiffOutput() - handles object values', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'updated',
    diff: [
      {
        property: 'config',
        currentValue: { nested: true },
        status: 'added'
      }
    ]
  }

  const result = formatDiffOutput(objectDiff)
  t.true(result.includes('config'))
  t.true(result.includes('{"nested":true}'))
})

test('formatDiffOutput() - uses custom env names in header', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'updated',
    diff: [
      {
        property: 'key',
        currentValue: 'value',
        status: 'added'
      }
    ]
  }

  const result = formatDiffOutput(objectDiff, 'dev', 'prod')
  t.true(result.includes('dev'))
  t.true(result.includes('prod'))
})

test('formatDiffOutput() - deeply nested properties use dot notation', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'updated',
    diff: [
      {
        property: 'llmKeys',
        status: 'updated',
        diff: [
          {
            property: 'anthropic',
            status: 'updated',
            diff: [
              {
                property: 'apiKey',
                previousValue: 'key1',
                currentValue: 'key2',
                status: 'updated'
              }
            ]
          }
        ]
      }
    ]
  }

  const result = formatDiffOutput(objectDiff)
  t.true(result.includes('llmKeys.anthropic.apiKey'))
})

test('hasDifferences() - returns false for equal status', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'equal',
    diff: []
  }

  t.false(hasDifferences(objectDiff))
})

test('hasDifferences() - returns true for updated status', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'updated',
    diff: []
  }

  t.true(hasDifferences(objectDiff))
})

test('hasDifferences() - returns true for added status', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'added',
    diff: []
  }

  t.true(hasDifferences(objectDiff))
})

test('hasDifferences() - returns true for deleted status', (t) => {
  const objectDiff = {
    type: 'object',
    status: 'deleted',
    diff: []
  }

  t.true(hasDifferences(objectDiff))
})
