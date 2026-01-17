# Mysterio

**Unified configuration management for Node.js applications**

Mysterio combines your local config files and AWS Secrets Manager into a single, easy-to-use configuration object. No more juggling multiple configuration sources or worrying about where your settings live - everything is merged intelligently at runtime.

## Upgrading from v2.x?

See the [Migration Guide](MIGRATION-v3.md) for detailed instructions on upgrading from v2.x to v3.0.

## Why Mysterio?

### 🎯 Single Source of Truth
Stop managing configs and secrets separately. Mysterio merges them into one unified configuration object, giving you a single place to access all your application settings.

### 🚀 The Simple Use Case: Environment Configs + Secrets
The most common pattern is simple:
1. **Environment config** - Your non-sensitive settings per environment (e.g., `config/production.json`)
2. **AWS Secrets** - Your sensitive data (passwords, API keys, tokens)

Mysterio merges them at runtime into one config object. That's it!

### 🔀 Smart Merging System (Optional Layers)
For more complex scenarios, Mysterio supports a **layered merging strategy**:

```
default.json -> env.json -> secrets (AWS) -> .mysteriorc
 (optional)     (required)     (required)    (optional)
```

**Core (required):**
- **env.json** - Environment-specific configs (production.json, dev.json, etc.)
- **secrets** - Secure values from AWS Secrets Manager

**Optional layers:**
- **default.json** - Base configs shared across all environments
- **.mysteriorc** - Local developer overrides (gitignored)

Each layer **overrides** values from the previous layers, allowing you to:
- Define base configs that work everywhere (optional)
- Set environment-specific settings (required)
- Add secure secrets from AWS Secrets Manager (required)
- Use local overrides for development (optional)

**Simple Example (env + secrets only):**

```json
// config/production.json
{
  "database": {
    "host": "prod-db.example.com",
    "port": 5432
  },
  "apiUrl": "https://api.production.com"
}

// AWS Secrets Manager (myapp/production)
{
  "database": {
    "password": "super-secret-password",
    "username": "dbuser"
  },
  "apiKey": "secret-api-key"
}

// Final merged result:
{
  "database": {
    "host": "prod-db.example.com",  // from production.json
    "port": 5432,                    // from production.json
    "username": "dbuser",            // from AWS Secrets
    "password": "super-secret-password"  // from AWS Secrets
  },
  "apiUrl": "https://api.production.com",  // from production.json
  "apiKey": "secret-api-key"  // from AWS Secrets
}
```

**Advanced Example (with all optional layers):**

```json
// config/default.json (optional - base for all environments)
{
  "database": {
    "port": 5432
  },
  "apiUrl": "http://localhost:3000"
}

// config/production.json (required - environment specific)
{
  "database": {
    "host": "prod-db.example.com"
  },
  "apiUrl": "https://api.production.com"
}

// AWS Secrets Manager (required - secrets)
{
  "database": {
    "password": "super-secret-password"
  }
}

// .mysteriorc (optional - local overrides, gitignored)
{
  "database": {
    "host": "127.0.0.1"
  }
}

// Final merged result with all layers:
{
  "database": {
    "host": "127.0.0.1",      // from .mysteriorc (highest priority)
    "port": 5432,              // from default.json
    "password": "super-secret-password"  // from AWS Secrets
  },
  "apiUrl": "https://api.production.com"  // from production.json
}
```

### ⚡ Runtime Loading
Configs and secrets are loaded at runtime, meaning:
- **No build-time baking** - Change configs without rebuilding
- **Environment-aware** - Automatically picks the right config based on `NODE_ENV`
- **Dynamic secrets** - Rotate AWS secrets without redeploying
- **Fresh on every start** - Always get the latest configuration

### 🔒 Security First
- Secrets stay in AWS Secrets Manager (never committed to git)
- Local overrides (`.mysteriorc`) can be gitignored for developer-specific settings
- Supports AWS IAM roles and secure credential management

## Installation

```bash
npm install mysterio
```

## 🚀 Quick Start

The simplest setup only requires environment configs and AWS secrets.

### 1. Create your config directory (minimal setup)

```
your-project/
├── config/
│   ├── production.json   # Production settings (required)
│   ├── dev.json          # Dev environment (optional)
│   └── local.json        # Local development (optional)
└── package.json
```

**Optional files:**
- `config/default.json` - Base configs for all environments
- `.mysteriorc` - Local developer overrides (gitignore this!)

### 2. Create your environment config

**config/production.json:**
```json
{
  "appName": "MyApp",
  "port": 8080,
  "database": {
    "host": "prod-db.example.com",
    "port": 5432
  },
  "apiUrl": "https://api.production.com"
}
```

**config/local.json (for local development):**
```json
{
  "appName": "MyApp",
  "port": 3000,
  "database": {
    "host": "localhost",
    "port": 5432
  },
  "apiUrl": "http://localhost:3000"
}
```

### 3. Set up AWS Secrets Manager

Create a secret in AWS Secrets Manager with the name pattern: `{package-name}/{environment}`

For example, if your package.json has `"name": "myapp"` and you're running in production:
- Secret name: `myapp/production`

#### ✨ Option A: Using the Key/value Tab (Recommended)

AWS Secrets Manager doesn't support JSON validation in the plaintext editor, which can lead to invalid JSON being saved. Instead, it's much more convenient to use the **Key/value tab** when creating or editing secrets. Mysterio can automatically unflatten these key-value pairs into nested objects:

**In AWS Console (Key/value tab):**
```
database.password = super-secret-password
database.username = dbuser
apiKey = your-secret-api-key
```

**In your code (with unflatten enabled):**
```javascript
const config = await mysterio.getMerged(['default', 'env', 'secrets', 'rc'], true)
// Secrets are automatically unflattened to:
// {
//   database: {
//     password: 'super-secret-password',
//     username: 'dbuser'
//   },
//   apiKey: 'your-secret-api-key'
// }
```

#### 📝 Option B: Using JSON (Plaintext Tab)

You can still use traditional JSON format in the plaintext editor:

**Secret value:**
```json
{
  "database": {
    "password": "super-secret-password",
    "username": "dbuser"
  },
  "apiKey": "your-secret-api-key"
}
```

### 4. Use in your application

```javascript
import { Mysterio } from 'mysterio'

const mysterio = new Mysterio()
const config = await mysterio.getMerged()

console.log(config)
// {
//   appName: 'MyApp',
//   port: 8080,
//   database: {
//     host: 'prod-db.example.com',
//     port: 5432,
//     username: 'dbuser',
//     password: 'super-secret-password'
//   },
//   apiKey: 'your-secret-api-key'
// }

// Use your config
const db = await connectToDatabase(config.database)
```

## API

### `new Mysterio(options)`

Creates a new Mysterio instance.

**Options:**
- `configDirPath` (string): Path to config directory. Default: `./config`
- `localRcPath` (string): Path to local RC file. Default: `./.mysteriorc`
- `secretName` (string): Custom AWS secret name. Default: `{package-name}/{NODE_ENV || 'local'}`
- `env` (string): Override environment name instead of using `NODE_ENV`. Affects both config file selection and secret name generation
- `awsParams` (object): AWS SDK parameters for Secrets Manager client
- `client` (function): Custom client function for fetching secrets

**Example:**
```javascript
const mysterio = new Mysterio({
  configDirPath: './my-configs',
  localRcPath: './.myapprc',
  secretName: 'custom-secret-name',
  env: 'staging',  // Use staging configs regardless of NODE_ENV
  awsParams: {
    region: 'us-west-2'
  }
})
```

### `mysterio.getMerged(mergingOrder, unflattenSecrets)`

Returns the merged configuration object.

**Parameters:**
- `mergingOrder` (array): Custom merge order. Default: `['default', 'env', 'secrets', 'rc']`
- `unflattenSecrets` (boolean): Whether to unflatten dotted secret keys into nested objects. Default: `false`

**Returns:** Promise<object> - Merged configuration object

**Example:**
```javascript
// Default order with flat secrets
const config = await mysterio.getMerged()

// With unflattened secrets (recommended for AWS Key/value tab)
const config = await mysterio.getMerged(['default', 'env', 'secrets', 'rc'], true)

// Custom order - secrets override everything
const config = await mysterio.getMerged(['default', 'env', 'rc', 'secrets'])

// Partial config - only default and env
const config = await mysterio.getMerged(['default', 'env'])
```

### Individual Config Methods

#### `mysterio.getDefaultConfig()`
Returns the default config from `config/default.json`

#### `mysterio.getEnvConfigs()`
Returns environment-specific config based on `NODE_ENV` (e.g., `config/production.json`)

#### `mysterio.getRcConfigs()`
Returns local RC file config from `.mysteriorc`

#### `mysterio.getSecrets(unflatten)`
Returns secrets from AWS Secrets Manager

**Parameters:**
- `unflatten` (boolean): Whether to unflatten dotted keys into nested objects. Default: `false`

**Example:**
```javascript
// Get secrets as flat key-value pairs
const secrets = await mysterio.getSecrets(false)
// { 'database.password': 'secret', 'database.username': 'user' }

// Get secrets with dotted keys unflattened into nested objects
const secrets = await mysterio.getSecrets(true)
// { database: { password: 'secret', username: 'user' } }
```

## Configuration Sources

### Required Sources

#### Environment Config (`{env}.json`)
Environment-specific configuration based on `NODE_ENV` (or the `env` constructor option):
- `NODE_ENV=production` -> `config/production.json`
- `NODE_ENV=development` -> `config/development.json`
- `NODE_ENV=test` -> `config/test.json`
- Not set -> `config/local.json`
- `env: 'staging'` in constructor -> `config/staging.json` (overrides `NODE_ENV`)

This is where your non-sensitive settings live (ports, hosts, feature flags, etc.)

#### Secrets (AWS Secrets Manager)
Secure secrets stored in AWS, automatically fetched based on:
- Package name from `package.json`
- Current environment (`NODE_ENV` or the `env` constructor option)
- Pattern: `{package-name}/{environment}`

This is where your sensitive data lives (passwords, API keys, tokens, etc.)

### Optional Sources

#### Default Config (`default.json`) - OPTIONAL
Base configuration that applies to all environments. Use this to avoid duplicating common settings across environment files.

If you don't need shared base configs, you can skip this file entirely.

#### RC File (`.mysteriorc`) - OPTIONAL
Local developer overrides (should be gitignored). Perfect for:
- Database connections to local instances
- API endpoints pointing to localhost
- Debug flags
- Developer-specific settings

Most projects don't need this - only use it if developers need local overrides.

## Advanced Usage

### 🔓 Unflattening Secrets (Key/Value Tab Support)

AWS Secrets Manager's Key/value tab is more convenient than the plaintext JSON editor because it doesn't require JSON validation and is easier to edit. However, it stores secrets as flat key-value pairs. Mysterio can automatically unflatten these dotted keys into nested objects.

**✨ Why use the Key/value tab?**
- ⚠️ AWS Secrets Manager doesn't support JSON validation in the plaintext editor
- 💥 Invalid JSON can be accidentally saved, breaking your application
- 🎯 The Key/value tab provides a better UI for managing individual secrets
- ⚡ Easier to add, remove, or update individual values

**How it works:**

When you enable unflattening, Mysterio converts dotted keys like `database.password` into nested objects:

```javascript
// AWS Secrets (Key/value tab):
// database.host = prod-db.example.com
// database.port = 5432
// database.credentials.password = secret123
// database.credentials.username = dbuser
// apiKey = my-api-key

// With unflatten enabled:
const config = await mysterio.getMerged(['default', 'env', 'secrets'], true)

console.log(config)
// {
//   database: {
//     host: 'prod-db.example.com',
//     port: 5432,
//     credentials: {
//       password: 'secret123',
//       username: 'dbuser'
//     }
//   },
//   apiKey: 'my-api-key'
// }
```

**🔀 Deep merging with unflattened secrets:**

Unflattened secrets merge deeply with your config files:

```javascript
// config/production.json
{
  "database": {
    "host": "prod-db.example.com",
    "maxConnections": 100
  }
}

// AWS Secrets (Key/value tab):
// database.password = secret123
// database.username = dbuser

// With unflatten enabled:
const config = await mysterio.getMerged(['env', 'secrets'], true)

// Result - secrets merge into existing database object:
{
  "database": {
    "host": "prod-db.example.com",
    "maxConnections": 100,
    "password": "secret123",  // From secrets
    "username": "dbuser"       // From secrets
  }
}
```

**⚠️ Key Conflicts:**

When using the unflatten feature, be aware of how key conflicts are handled. If a parent key already exists as a non-object value, it cannot be converted to accept nested properties. The behavior follows JavaScript object property assignment order:

```javascript
// AWS Secrets (Key/value tab):
// database = "connection-string"
// database.host = "localhost"

// With unflatten enabled:
const secrets = await mysterio.getSecrets(true)

// Result: The last value wins based on object key order
// If 'database' comes after 'database.host' in the object:
// { database: "connection-string" }

// If 'database.host' comes after 'database':
// { database: "connection-string" }
// Note: 'database.host' is ignored because 'database' is already a string
```

**💡 Best Practice:** Avoid conflicts by using consistent naming:
- ✅ Use only nested keys: `database.host`, `database.port`, `database.password`
- ❌ Don't mix: `database` (as value) and `database.host` (as nested key)

This ensures your secrets unflatten predictably into nested objects.

### Custom Secret Client

You can provide your own secret fetching function:

```javascript
const customClient = async (secretName) => {
  // Fetch from your own secret management system
  return {
    apiKey: 'custom-secret'
  }
}

const mysterio = new Mysterio({
  client: customClient
})
```

### Debugging

Mysterio uses the [debug](https://www.npmjs.com/package/debug) module. Enable debug logs:

```bash
DEBUG=Mysterio:* node your-app.js
```

### TypeScript Support

```typescript
import { Mysterio } from 'mysterio'

interface MyConfig {
  database: {
    host: string
    port: number
    password: string
  }
  apiKey: string
}

const mysterio = new Mysterio()
const config = await mysterio.getMerged() as MyConfig
```

## 📚 Best Practices

### 1. Gitignore Sensitive Files
```gitignore
.mysteriorc
config/local.json
```

### 2. Use Environment Variables for Runtime Control
```javascript
const mysterio = new Mysterio({
  configDirPath: process.env.CONFIG_PATH || './config'
})
```

### 3. Validate Your Config
```javascript
const config = await mysterio.getMerged()

if (!config.database?.password) {
  throw new Error('Database password not configured!')
}
```

### 4. Organize Secrets by Environment
- `myapp/local` - Local development secrets
- `myapp/dev` - Development environment
- `myapp/staging` - Staging environment
- `myapp/production` - Production environment

## 🔀 How Merging Works

Mysterio uses [lodash.merge](https://lodash.com/docs/#merge) for deep merging:

1. **Order matters**: Later sources override earlier ones
2. **Deep merge**: Nested objects are merged, not replaced
3. **Arrays are replaced**: Arrays from later sources completely replace earlier ones

**Example:**
```javascript
// default.json
{
  "features": ["feature1", "feature2"],
  "database": { "host": "localhost", "port": 5432 }
}

// production.json
{
  "features": ["feature3"],
  "database": { "host": "prod.db" }
}

// Merged result:
{
  "features": ["feature3"],  // Replaced (arrays don't merge)
  "database": {
    "host": "prod.db",       // Overridden
    "port": 5432             // Kept from default
  }
}
```

## 🌍 Environment Detection

The environment is determined by `NODE_ENV`:

```bash
# Uses config/production.json and myapp/production secrets
NODE_ENV=production node app.js

# Uses config/dev.json and myapp/dev secrets
NODE_ENV=dev node app.js

# Uses config/local.json and myapp/local secrets (default)
node app.js
```

### Overriding Environment with `env` Option

You can override the environment detection by passing the `env` option to the constructor. This is useful when you want to load a specific environment's configuration regardless of the `NODE_ENV` value:

```javascript
// Always use staging config, even if NODE_ENV is production
const mysterio = new Mysterio({
  env: 'staging'
})

// This will load:
// - config/staging.json (instead of using NODE_ENV)
// - myapp/staging secrets (instead of myapp/production)
```

**Use cases:**
- **Testing**: Load production configs in a test environment without changing `NODE_ENV`
- **Multi-environment apps**: Run multiple instances with different configs in the same process
- **Config validation**: Test different environment configs without modifying environment variables
- **CI/CD pipelines**: Explicitly specify which environment to use regardless of system settings

## CLI Tools

Mysterio includes CLI tools to help manage your configuration and secrets workflow.

### Installation

After installing mysterio, the CLI is available as `mysterio` (if installed globally) or via `npx mysterio`.

### Commands

#### `generate-template`

Generate an AWS Secrets Manager template from your config file's `<aws_secret_manager>` placeholders.

```bash
# Output to stdout
mysterio generate-template -c ./config/production.json

# Output to file
mysterio generate-template -c ./config/production.json -o ./secrets-template.json
```

**Options:**
- `-c, --config <path>` (required) - Local config file path
- `-o, --output <path>` - Output file path (stdout if not specified)

**Example output:**
```json
{
  "database.password": "replace_with_secret",
  "database.username": "replace_with_secret",
  "api.key": "replace_with_secret"
}
```

#### `compare-secret`

Find missing keys between an AWS secret and your local config's placeholders.

```bash
# Using defaults (reads ./config/{NODE_ENV}.json and {packageName}/{NODE_ENV} secret)
mysterio compare-secret

# Specify environment explicitly
mysterio compare-secret -e production

# Specify custom paths
mysterio compare-secret -c ./config/production.json -s myapp/production
```

**Options:**
- `-c, --config <path>` - Local config file path (default: `./config/{env}.json`)
- `-s, --secret <name>` - AWS secret name (default: `{packageName}/{env}`)
- `-e, --env <env>` - Environment (default: `NODE_ENV` or `"local"`)
- `-r, --region <region>` - AWS region (default: `us-east-1`)
- `-o, --output <format>` - Output format: `text` or `json` (default: `text`)

**Exit codes:**
- `0` - All placeholders are present in the AWS secret
- `1` - Some placeholders are missing
- `2` - Error occurred

#### `compare-configs`

Compare merged configurations between two environments using superdiff.

```bash
# Compare staging and production configs (without secrets)
mysterio compare-configs --env1 staging --env2 production --sources "default,env"

# Compare with AWS secrets (uses default {packageName}/{env} pattern)
mysterio compare-configs --env1 staging --env2 production

# Compare with custom secret template
mysterio compare-configs --env1 staging --env2 production -s "myapp/{env}"
```

**Options:**
- `--env1 <env>` (required) - First environment
- `--env2 <env>` (required) - Second environment
- `-d, --config-dir <path>` - Config directory (default: `./config`)
- `-s, --secret <template>` - Secret name template with `{env}` placeholder (default: `{packageName}/{env}`)
- `-r, --region <region>` - AWS region (default: `us-east-1`)
- `--sources <sources>` - Comma-separated merge sources (default: `default,env,secrets`)
- `-o, --output <format>` - Output format: `text` or `json` (default: `text`)

**Example output:**
```
Comparing configs: staging vs production
Sources: default, env

~ app.port: 3001 -> 8080
~ debug: true -> false
+ replicas: 3
```

**Output symbols:**
- `+` Added (only in env2)
- `-` Deleted (only in env1)
- `~` Updated (changed between environments)

**Exit codes:**
- `0` - Configs are identical
- `1` - Configs have differences
- `2` - Error occurred

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Apache-2.0

## Author

Amit Tal

## Repository

[https://github.com/amitosdev/mysterio](https://github.com/amitosdev/mysterio)
