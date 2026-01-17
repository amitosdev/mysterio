const PLACEHOLDER = '<aws_secret_manager>'

export function findPlaceholders(obj, prefix = '') {
  const results = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value === PLACEHOLDER) {
      results.push(path)
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      results.push(...findPlaceholders(value, path))
    }
  }
  return results
}
