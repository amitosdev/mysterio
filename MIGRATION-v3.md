# Migration Guide: Mysterio v2.x → v3.x

This guide will help you migrate from Mysterio v2.x to v3.x.

## Overview of Changes

Version 3.0 is a major release that introduces several breaking changes:

1. **ES Modules (ESM)** - Migration from CommonJS to ESM
2. **Simplified Constructor** - Removed required `packageName` parameter
3. **New API Methods** - Clearer separation of config sources
4. **Improved `getMerged()` API** - More flexible merging with custom order support
5. **Private Fields** - Better encapsulation with private class fields

## Breaking Changes

### 1. ES Modules Migration

**v2.x (CommonJS):**
```javascript
const { Mysterio } = require('mysterio')
```

**v3.0 (ESM):**
```javascript
import { Mysterio } from 'mysterio'
```

**Action Required:**
- Update your `package.json` to include `"type": "module"`, OR
- Rename your JavaScript files from `.js` to `.mjs`, OR
- Use `.mjs` extension for files importing Mysterio

### 2. Constructor Changes

#### Removed: `packageName` Parameter

The `packageName` parameter is **no longer required** (or accepted). Mysterio now automatically reads your package name from `package.json`.

**v2.x:**
```javascript
const mysterio = new Mysterio({
  packageName: 'myapp',  // Required in v2.x
  configDirPath: './config'
})
```

**v3.0:**
```javascript
const mysterio = new Mysterio({
  configDirPath: './config'
  // packageName is automatically detected from package.json
})
```

**Action Required:**
- Remove the `packageName` parameter from your constructor calls
- Ensure your `package.json` has a valid `name` field

**Alternative: Using `secretName` to Override**

If you don't want Mysterio to read from `package.json`, you can explicitly set the full secret name using the `secretName` parameter:

```javascript
const mysterio = new Mysterio({
  secretName: 'my-custom-app/production'  // Explicit secret name
})
```

This gives you full control over the secret path without relying on automatic detection from `package.json`.

#### Removed: `env` Parameter

The `env` parameter has been removed. The environment is now always determined by `NODE_ENV` at runtime.

**v2.x:**
```javascript
const mysterio = new Mysterio({
  packageName: 'myapp',
  env: 'production'  // Removed in v3.0
})
```

**v3.0:**
```javascript
// Environment is determined by NODE_ENV
const mysterio = new Mysterio({
  // env is automatically determined from process.env.NODE_ENV
})
```

**Action Required:**
- Remove the `env` parameter
- Use `NODE_ENV` environment variable instead

**Alternative: Using `secretName` to Override**

If you don't want Mysterio to use `NODE_ENV` for determining the environment, you can explicitly set the full secret name using the `secretName` parameter:

```javascript
const mysterio = new Mysterio({
  secretName: 'myapp/custom-environment'  // Explicit secret name with custom environment
})
```

This allows you to use any environment naming convention you prefer, independent of `NODE_ENV`.

#### Renamed: `_client` → `client`

The internal client parameter has been renamed and is now a public option.

**v2.x:**
```javascript
const mysterio = new Mysterio({
  packageName: 'myapp',
  _client: customClient  // Private parameter
})
```

**v3.0:**
```javascript
const mysterio = new Mysterio({
  client: customClient  // Now a documented public option
})
```

**Action Required:**
- Rename `_client` to `client` if you're using a custom secrets client

#### Renamed: `localRCPath` → `localRcPath`

The parameter name has been made consistent (lowercase 'c').

**v2.x:**
```javascript
const mysterio = new Mysterio({
  packageName: 'myapp',
  localRCPath: './.myapprc'  // Capital C
})
```

**v3.0:**
```javascript
const mysterio = new Mysterio({
  localRcPath: './.myapprc'  // Lowercase c
})
```

**Action Required:**
- Update `localRCPath` to `localRcPath` (if used)

### 3. `getMerged()` API Changes

The `getMerged()` method has a completely new API that is more flexible and intuitive.

**v2.x:**
```javascript
const config = await mysterio.getMerged({
  isAddEnvProp: false,
  isGetLocal: true,
  isGetTest: false
})
```

**v3.0:**
```javascript
// Default behavior - merges all sources
const config = await mysterio.getMerged()

// Or specify custom merge order
const config = await mysterio.getMerged(['default', 'env', 'secrets', 'rc'])

// Skip certain sources
const config = await mysterio.getMerged(['env', 'secrets'])  // No default or rc
```

**Action Required:**
- If using default `getMerged()` - no changes needed
- If using options:
  - Remove `isAddEnvProp`, `isGetLocal`, `isGetTest` parameters
  - Use the `mergingOrder` array parameter to control which sources are merged

**Migration Examples:**

| v2.x | v3.0 |
|------|------|
| `getMerged()` | `getMerged()` (no change) |
| `getMerged({ isGetLocal: false })` | `getMerged(['default', 'env', 'secrets', 'rc'])` (no equivalent - secrets are always fetched, use custom client to skip) |
| `getMerged({ isGetTest: false })` | `getMerged(['default', 'env', 'secrets', 'rc'])` (no equivalent - secrets are always fetched, use custom client to skip) |
| `getMerged({ isAddEnvProp: true })` | Not supported - add env detection to your application code instead |

### 4. Method Name Changes

Several methods have been renamed for clarity:

| v2.x | v3.0 |
|------|------|
| `getDefaultConfigs()` | `getDefaultConfig()` (singular) |
| `getEnvConfigs()` | `getEnvConfigs()` (no change) |
| `getLocalRC()` | `getRcConfigs()` |
| `getSecrets()` | `getSecrets()` (no change) |

**v2.x:**
```javascript
const defaults = await mysterio.getDefaultConfigs()
const rc = await mysterio.getLocalRC()
```

**v3.0:**
```javascript
const defaults = await mysterio.getDefaultConfig()  // Singular
const rc = await mysterio.getRcConfigs()  // Renamed
```

**Action Required:**
- Update `getDefaultConfigs()` → `getDefaultConfig()`
- Update `getLocalRC()` → `getRcConfigs()`

### 5. Export Name Changes

**v2.x:**
```javascript
const { getSecretsClient } = require('mysterio')
```

**v3.0:**
```javascript
import { getAwsSecretsClient } from 'mysterio'
```

**Action Required:**
- Rename `getSecretsClient` → `getAwsSecretsClient`

## New Features in v3.0

### 1. Flexible Merge Order

You can now control the exact order in which configs are merged:

```javascript
// Secrets override everything (including RC)
const config = await mysterio.getMerged(['default', 'env', 'rc', 'secrets'])

// Only merge environment and secrets (skip default and RC)
const config = await mysterio.getMerged(['env', 'secrets'])

// Custom order
const config = await mysterio.getMerged(['secrets', 'default', 'env'])
```

### 2. Better Error Handling

Missing config files no longer throw errors - they return empty objects. This makes optional configs truly optional.

```javascript
// In v3.0, if default.json doesn't exist, it returns {}
const defaults = await mysterio.getDefaultConfig()  // Returns {} if file missing
```

### 3. Automatic Package Name Detection

No need to pass `packageName` anymore - it's automatically detected from your `package.json`:

```javascript
// v3.0 automatically reads package.json
const mysterio = new Mysterio()
const config = await mysterio.getMerged()
// Uses secrets from: {package-name-from-package.json}/{NODE_ENV}
```

### 4. Private Fields for Better Encapsulation

Internal properties are now truly private using JavaScript private fields (`#`):

```javascript
// These are no longer accessible:
mysterio._client      // Now mysterio.#client (private)
mysterio._secretName  // Now mysterio.#secretName (private)
mysterio.env          // Removed (use process.env.NODE_ENV)
```

## New Features in v3.1

### Secret Unflattening (Key/Value Tab Support)

AWS Secrets Manager's Key/value tab is more convenient than JSON, but it doesn't support JSON validation which can cause invalid JSON to be saved. With v3.1, you can now use the Key/value tab and Mysterio will automatically unflatten dotted keys into nested objects.

**Why this matters:**
- AWS Secrets Manager doesn't validate JSON in the plaintext editor
- Invalid JSON can break your application
- The Key/value tab is easier to use for managing secrets
- Dotted keys like `database.password` are automatically converted to `{ database: { password: ... } }`

**How to use it:**

```javascript
// In AWS Console (Key/value tab):
// database.host = prod-db.example.com
// database.password = secret123
// apiKey = my-key

// Enable unflattening in your code:
const config = await mysterio.getMerged(['default', 'env', 'secrets'], true)

// Result:
// {
//   database: {
//     host: 'prod-db.example.com',
//     password: 'secret123'
//   },
//   apiKey: 'my-key'
// }
```

You can also unflatten secrets independently:

```javascript
// Unflatten secrets only
const secrets = await mysterio.getSecrets(true)
```

**Default behavior (backward compatible):**
By default, secrets are NOT unflattened to maintain backward compatibility:

```javascript
// Default - secrets remain flat (backward compatible)
const config = await mysterio.getMerged()
const secrets = await mysterio.getSecrets()
```

## Step-by-Step Migration

### Step 1: Update to ESM

**Option A: Update package.json**
```json
{
  "type": "module"
}
```

**Option B: Use .mjs files**
```bash
mv index.js index.mjs
```

### Step 2: Update Imports

```javascript
// Before
const { Mysterio, getSecretsClient } = require('mysterio')

// After
import { Mysterio, getAwsSecretsClient, getConfigsFromFile } from 'mysterio'
```

### Step 3: Update Constructor

```javascript
// Before
const mysterio = new Mysterio({
  packageName: 'myapp',           // REMOVE
  env: 'production',               // REMOVE
  configDirPath: './config',       // KEEP
  localRCPath: './.mysteriorc',   // RENAME to localRcPath
  secretName: 'custom/secret',    // KEEP
  awsParams: { region: 'us-west-2' },  // KEEP
  _client: customClient           // RENAME to client
})

// After
const mysterio = new Mysterio({
  configDirPath: './config',
  localRcPath: './.mysteriorc',      // Renamed
  secretName: 'custom/secret',
  awsParams: { region: 'us-west-2' },
  client: customClient               // Renamed
})
```

### Step 4: Update getMerged() Calls

```javascript
// Before
const config = await mysterio.getMerged({
  isAddEnvProp: false,
  isGetLocal: true,
  isGetTest: false
})

// After - Default behavior (recommended)
const config = await mysterio.getMerged()

// Or with custom order
const config = await mysterio.getMerged(['default', 'env', 'secrets', 'rc'])
```

### Step 5: Update Method Calls

```javascript
// Before
const defaults = await mysterio.getDefaultConfigs()  // Plural
const rc = await mysterio.getLocalRC()

// After
const defaults = await mysterio.getDefaultConfig()   // Singular
const rc = await mysterio.getRcConfigs()
```

### Step 6: Update Environment Handling

```javascript
// Before
const mysterio = new Mysterio({
  packageName: 'myapp',
  env: 'production'
})

// After - Use NODE_ENV
process.env.NODE_ENV = 'production'  // Or set via shell
const mysterio = new Mysterio()
```

## Complete Example

### Before (v2.x):

```javascript
const { Mysterio } = require('mysterio')

const mysterio = new Mysterio({
  packageName: 'myapp',
  env: process.env.NODE_ENV || 'local',
  configDirPath: './config',
  localRCPath: './.mysteriorc'
})

const config = await mysterio.getMerged({
  isGetLocal: true,
  isGetTest: false
})

const defaults = await mysterio.getDefaultConfigs()
const rc = await mysterio.getLocalRC()
```

### After (v3.0):

```javascript
import { Mysterio } from 'mysterio'

const mysterio = new Mysterio({
  configDirPath: './config',
  localRcPath: './.mysteriorc'
})

// Default merging (equivalent to v2.x default)
const config = await mysterio.getMerged()

// Individual sources
const defaults = await mysterio.getDefaultConfig()
const rc = await mysterio.getRcConfigs()
```

## FAQ

### Q: Do I need to change my config files?

**A:** No! Your configuration files (JSON files in the `config` directory and AWS Secrets Manager) remain exactly the same.

### Q: Will my AWS secrets structure change?

**A:** No. The secret naming convention (`{package-name}/{environment}`) remains the same.

### Q: Can I still use CommonJS?

**A:** No. Version 3.0 is ESM-only. You must migrate to ES modules.

### Q: How do I skip fetching secrets for local/test environments?

**A:** Use a custom merge order or provide a custom `client` function:

```javascript
// Option 1: Skip secrets source
const config = await mysterio.getMerged(['default', 'env', 'rc'])

// Option 2: Custom client that returns empty object
const mysterio = new Mysterio({
  client: async () => ({})
})
```

### Q: What happened to the `isAddEnvProp` option?

**A:** It was removed. If you need environment detection in your config, add it in your application code:

```javascript
const config = await mysterio.getMerged()
const appConfig = {
  ...config,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development'
}
```

### Q: Can I still customize the AWS region?

**A:** Yes! Use the `awsParams` option:

```javascript
const mysterio = new Mysterio({
  awsParams: {
    region: 'eu-west-1'
  }
})
```

### Q: I don't want to use package.json for the package name or NODE_ENV for the environment. What can I do?

**A:** Use the `secretName` parameter to explicitly specify your secret path:

```javascript
const mysterio = new Mysterio({
  secretName: 'my-custom-name/my-custom-env'
})
```

This gives you complete control over the secret naming without relying on automatic detection from `package.json` or `NODE_ENV`.

### Q: Should I migrate my secrets to use the Key/value tab? (v3.1+)

**A:** It's recommended but not required. The Key/value tab provides:
- Better UI for managing secrets
- No risk of invalid JSON
- Easier to update individual values
- Works seamlessly with the `unflatten` feature (available in v3.1+)

To migrate:

1. **In AWS Console:**
   - Open your secret in AWS Secrets Manager
   - Switch to the Key/value tab
   - Add your secrets using dotted notation (e.g., `database.password`, `database.username`)

2. **In your code:**
   - Enable unflattening: `getMerged(['default', 'env', 'secrets', 'rc'], true)`
   - Or for secrets only: `getSecrets(true)`

**Example migration:**

Before (JSON):
```json
{
  "database": {
    "password": "secret123",
    "username": "user"
  }
}
```

After (Key/value tab):
```
database.password = secret123
database.username = user
```

Your code:
```javascript
// Enable unflattening
const config = await mysterio.getMerged(['default', 'env', 'secrets'], true)
// Result is the same nested structure
```

### Q: Is the unflatten feature backward compatible? (v3.1+)

**A:** Yes! By default, secrets are NOT unflattened, maintaining backward compatibility. You must explicitly enable it:

```javascript
// Backward compatible (default) - secrets remain flat
const config = await mysterio.getMerged()

// New behavior (v3.1+) - unflatten dotted keys
const config = await mysterio.getMerged(['default', 'env', 'secrets', 'rc'], true)
```

## Need Help?

If you encounter issues during migration:

1. Check the [README](README.md) for updated examples
2. Review the [test files](test/Mysterio.test.mjs) for usage examples
3. Open an issue on [GitHub](https://github.com/amitosdev/mysterio/issues)

## Summary

The migration from v2.x to v3.0 involves:

1. Migrate to ES modules
2. Remove `packageName` from constructor (auto-detected now)
3. Remove `env` from constructor (use `NODE_ENV` instead)
4. Rename `localRCPath` → `localRcPath`
5. Rename `_client` → `client`
6. Update `getMerged()` to use array parameter instead of options object
7. Rename methods: `getDefaultConfigs()` → `getDefaultConfig()` and `getLocalRC()` → `getRcConfigs()`
8. Rename export: `getSecretsClient` → `getAwsSecretsClient`

The changes simplify the API, improve encapsulation, and provide more flexibility in how configs are merged.
