import Table from 'cli-table3'

function formatValue(value) {
  if (value === undefined) return ''
  if (value === null) return 'null'
  if (typeof value === 'string') return value
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

function collectDiffEntries(diff, prefix = '', entries = []) {
  const path = prefix ? `${prefix}.${diff.property}` : diff.property

  if (diff.status === 'updated') {
    if (diff.diff && diff.diff.length > 0) {
      for (const subDiff of diff.diff) {
        collectDiffEntries(subDiff, path, entries)
      }
    } else {
      entries.push({
        path,
        previousValue: diff.previousValue,
        currentValue: diff.currentValue,
        status: 'updated'
      })
    }
  } else if (diff.status === 'added') {
    entries.push({
      path,
      previousValue: undefined,
      currentValue: diff.currentValue,
      status: 'added'
    })
  } else if (diff.status === 'deleted') {
    entries.push({
      path,
      previousValue: diff.previousValue,
      currentValue: undefined,
      status: 'deleted'
    })
  }

  return entries
}

export function formatDiffOutput(objectDiff, env1 = 'env1', env2 = 'env2') {
  if (objectDiff.status === 'equal') {
    return 'No differences found.'
  }

  const entries = []
  for (const diff of objectDiff.diff) {
    collectDiffEntries(diff, '', entries)
  }

  if (entries.length === 0) {
    return 'No differences found.'
  }

  const table = new Table({
    head: ['property', env1, env2, 'status'],
    colWidths: [50, 70, 70, 15]
  })
  for (const entry of entries) {
    table.push([entry.path, formatValue(entry.previousValue), formatValue(entry.currentValue), entry.status])
  }

  return table.toString()
}

export function hasDifferences(objectDiff) {
  return objectDiff.status !== 'equal'
}
