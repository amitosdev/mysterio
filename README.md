# Mysterio 🎭

> A powerful configuration management library that seamlessly merges local configuration files with AWS Secrets Manager secrets, providing a unified and secure way to manage application settings across different environments.

## Why Mysterio?

Managing application configuration across different environments (development, staging, production) while keeping sensitive data secure is challenging. Mysterio solves this by:

- **Separating concerns**: Keep non-sensitive config in files, sensitive data in AWS Secrets Manager
- **Environment-specific settings**: Automatically loads the right configuration based on your environment
- **Secure defaults**: Prevents accidentally committing secrets to version control
- **Developer-friendly**: Supports local overrides for easy development

## How It Works

Mysterio uses a layered configuration approach with **deep merging**, combining settings in this order:

1. **Default configuration** (`config/default.json`) - Base settings for all environments
2. **Environment-specific config** (`config/[env].json`) - Environment-specific overrides
3. **AWS Secrets** - Sensitive data from AWS Secrets Manager
4. **Local overrides** (`.mysteriorc`) - Developer-specific settings (git-ignored)

### Deep Merge Behavior

Mysterio performs a **deep merge** of nested objects, meaning it intelligently combines objects at all levels rather than replacing them entirely. This is particularly powerful for complex configurations:

```javascript
// Example: How deep merge works

// From config/default.json:
{
  "database": {
    "host": "localhost",
    "port": 5432,
    "pool": { "min": 2, "max": 10 }
  }
}

// From config/production.json:
{
  "database": {
    "host": "prod.database.com",  // Overrides default host
    "pool": { "max": 50 }         // Only overrides max, keeps min: 2
  }
}

// From AWS Secrets:
{
  "database": {
    "user": "admin",
    "password": "secret123"       // Adds new properties
  }
}

// Final merged result:
{
  "database": {
    "host": "prod.database.com",  // From production.json
    "port": 5432,                  // From default.json (preserved)
    "pool": {
      "min": 2,                    // From default.json (preserved)
      "max": 50                    // From production.json (override)
    },
    "user": "admin",               // From AWS Secrets (added)
    "password": "secret123"        // From AWS Secrets (added)
  }
}
```

This deep merge capability allows you to:
- Keep configuration DRY (Don't Repeat Yourself)
- Override only what needs to change per environment
- Add sensitive data without duplicating structure
- Maintain complex nested configurations efficiently

## Installation

```bash
npm install --save mysterio
```

## Quick Start

### 1. Set up AWS Secrets Manager

Create a secret in AWS Secrets Manager with this naming convention:

```
[app-name]/[environment]
```

Example: `my-app/production`

Secret content (JSON):
```json
{
  "apiKey": "super-secret-key",
  "database": {
    "user": "admin",
    "password": "secure-password-123"
  },
  "auth": {
    "jwtSecret": "jwt-secret-key",
    "sessionSecret": "session-secret-key"
  }
}
```

### 2. Create Configuration Files

Create a `config` directory with your configuration files:

**config/default.json** (shared settings):
```json
{
  "app": {
    "name": "My Application",
    "version": "1.0.0"
  },
  "server": {
    "port": 3000,
    "timeout": 30000
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "pool": {
      "min": 2,
      "max": 10
    }
  },
  "features": {
    "analytics": true,
    "notifications": false
  }
}
```

**config/production.json** (production overrides):
```json
{
  "server": {
    "port": 8080,
    "timeout": 60000
  },
  "database": {
    "host": "prod.database.com",
    "pool": {
      "min": 10,
      "max": 50
    }
  },
  "features": {
    "notifications": true
  }
}
```

**config/development.json** (development settings):
```json
{
  "server": {
    "port": 3001
  },
  "database": {
    "host": "localhost",
    "port": 5432
  },
  "debug": true
}
```

### 3. Use Mysterio in Your Application

```javascript
import { Mysterio } from 'mysterio'

async function initializeApp() {
  const mysterio = new Mysterio({
    packageName: 'my-app',
    env: process.env.NODE_ENV || 'development'
  })

  try {
    // Get merged configuration from all sources
    const config = await mysterio.getMerged()

    // Result (in production) - Notice the DEEP MERGE:
    // {
    //   app: {
    //     name: 'My Application',      // From default.json
    //     version: '1.0.0'             // From default.json
    //   },
    //   server: {
    //     port: 8080,                  // From production.json (overrides default)
    //     timeout: 60000               // From production.json (overrides default)
    //   },
    //   features: {
    //     analytics: true,             // From default.json
    //     notifications: true          // From production.json (overrides default)
    //   },
    //   database: {                    // DEEP MERGED from multiple sources!
    //     host: 'prod.database.com',  // From production.json
    //     port: 5432,                  // From default.json (kept)
    //     pool: {                      // From production.json (overrides default)
    //       min: 10,
    //       max: 50
    //     },
    //     user: 'admin',               // From AWS Secrets (added)
    //     password: 'secure-password-123'  // From AWS Secrets (added)
    //   },
    //   apiKey: 'super-secret-key',   // From AWS Secrets
    //   auth: {                        // From AWS Secrets
    //     jwtSecret: 'jwt-secret-key',
    //     sessionSecret: 'session-secret-key'
    //   }
    // }

    return config
  } catch (error) {
    console.error('Failed to load configuration:', error)
    process.exit(1)
  }
}

// Use the configuration
const config = await initializeApp()
console.log(`Server starting on port ${config.server.port}`)
```

## Common Use Cases

### Development with Local Overrides

For local development, create a `.mysteriorc` file (add to `.gitignore`):

```json
{
  "database": {
    "host": "localhost",
    "port": 5433
  },
  "apiKey": "local-development-key",
  "debug": true
}
```

```javascript
const mysterio = new Mysterio({
  packageName: 'my-app',
  env: 'local',
  localRCPath: './.mysteriorc'
})

// This will merge your local overrides last, perfect for development
const config = await mysterio.getMerged({ isGetLocal: false })
```

### Testing Environment

```javascript
const mysterio = new Mysterio({
  packageName: 'my-app',
  env: 'test'
})

// Skip AWS secrets for testing
const config = await mysterio.getMerged({ isGetTest: false })
```

### Direct Secret Access

Sometimes you only need secrets without configuration:

```javascript
import { getSecretsClient } from 'mysterio'

const getSecrets = getSecretsClient({ region: 'us-west-2' })
const secrets = await getSecrets('my-app/production')
// Returns only the secrets from AWS, no config files
```

### Environment Detection

Add environment flags to your configuration:

```javascript
const config = await mysterio.getMerged({ isAddEnvProp: true })
// Adds: { isProduction: true } in production environment
// Useful for environment-specific logic
```

## API Reference

### `new Mysterio(options)`

Creates a new Mysterio instance.

**Options:**
- `packageName` (String, **required**) - Your application name
- `env` (String) - Environment name. Default: `process.env.NODE_ENV || 'local'`
- `awsParams` (Object) - AWS SDK parameters. Default: `{ region: 'us-east-1' }`
- `configDirPath` (String) - Configuration directory. Default: `./config`
- `localRCPath` (String) - Local override file. Default: `./.mysteriorc`
- `secretName` (String) - AWS secret name. Default: `${packageName}/${env}`

### `mysterio.getMerged(options)`

Returns the complete merged configuration.

**Options:**
- `isAddEnvProp` (Boolean) - Add environment flag. Default: `false`
- `isGetLocal` (Boolean) - Fetch AWS secrets in local env. Default: `true`
- `isGetTest` (Boolean) - Fetch AWS secrets in test env. Default: `false`

**Returns:** Promise<Object> - Merged configuration object

### `mysterio.getDefaultConfigs()`

Get only the file-based configuration (default + environment).

**Returns:** Promise<Object> - Configuration from files only

### `mysterio.getSecrets()`

Get only the AWS Secrets Manager secrets.

**Returns:** Promise<Object> - Secrets from AWS

### `mysterio.getLocalRC()`

Get only the local override configuration.

**Returns:** Promise<Object> - Local overrides

### `getSecretsClient(awsParams)`

Create a reusable secrets client.

**Parameters:**
- `awsParams` (Object) - AWS SDK parameters

**Returns:** Function - Async function that fetches secrets by name

## Best Practices

### 1. Security First

- **Never** commit sensitive data to version control
- Add `.mysteriorc` to `.gitignore`
- Use AWS Secrets Manager for all sensitive configuration
- Rotate secrets regularly

### 2. Configuration Structure

```javascript
// Good: Organized by feature/component
{
  "database": {
    "host": "...",
    "port": "..."
  },
  "cache": {
    "host": "...",
    "ttl": "..."
  }
}

// Avoid: Flat structure
{
  "databaseHost": "...",
  "databasePort": "...",
  "cacheHost": "..."
}
```

### 3. Environment Naming

Use consistent environment names across your stack:
- `local` - Local development
- `development` - Development server
- `staging` - Staging/pre-production
- `production` - Production

### 4. Error Handling

Always handle configuration loading errors:

```javascript
async function loadConfig() {
  const mysterio = new Mysterio({ packageName: 'my-app' })

  try {
    return await mysterio.getMerged()
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      // In production, fail fast
      console.error('Critical: Cannot load configuration', error)
      process.exit(1)
    } else {
      // In development, maybe use defaults
      console.warn('Using default configuration', error)
      return defaultConfig
    }
  }
}
```

## Migration Guide

### From CommonJS to ESM

If you're upgrading from an older CommonJS version:

**Before (CommonJS):**
```javascript
const { Mysterio } = require('mysterio')
```

**After (ESM):**
```javascript
import { Mysterio } from 'mysterio'
```

Make sure your `package.json` includes:
```json
{
  "type": "module"
}
```

## Troubleshooting

### AWS Credentials Issues

If you're getting AWS credential errors:

1. Ensure AWS credentials are configured:
   ```bash
   aws configure
   ```

2. Or use environment variables:
   ```bash
   export AWS_ACCESS_KEY_ID=your-key
   export AWS_SECRET_ACCESS_KEY=your-secret
   export AWS_REGION=us-east-1
   ```

3. For EC2 instances, use IAM roles

### Configuration Not Loading

1. Check file paths are correct
2. Verify JSON syntax in config files
3. Ensure proper AWS permissions for Secrets Manager
4. Check environment variable is set correctly

### Testing Issues

For unit tests, mock the AWS client:

```javascript
import { Mysterio } from 'mysterio'

const mockClient = () => Promise.resolve({
  secretKey: 'test-secret'
})

const mysterio = new Mysterio({
  packageName: 'test-app',
  _client: mockClient  // Use mock client
})
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Apache-2.0

## Author

Amit Tal