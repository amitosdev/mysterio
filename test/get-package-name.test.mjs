import test from 'ava'
import { getPackageName } from '../lib/get-package-name.mjs'

test('getPackageName() - returns package name from package.json', async (t) => {
  const packageName = await getPackageName()
  t.is(packageName, 'mysterio')
})

test('getPackageName() - returns a string', async (t) => {
  const packageName = await getPackageName()
  t.is(typeof packageName, 'string')
})

test('getPackageName() - returns non-empty package name', async (t) => {
  const packageName = await getPackageName()
  t.true(packageName.length > 0)
})
