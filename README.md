# Mysterio [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

A dead simple module to take a configuration file by environment, retrieve secrets from AWS secret manager and merge them.

## Install

```bash
> npm install --save mysterio
```

## Usage

1. Go to AWS secret manager and create secret with the following naming convention:

```text
<app name>/<environment>
```

Ex:

```text
log-collector/prod
```

2. Create a config folder that will contain the app configuration. Should be file per environment:

`config/local.json`

```json
{
  "port": 3000,
  "db": "secret!"
}
```

3. Create a new instance and merged the configuration

```javascript
const { name } = require('package.json')
const { Mysterio } = require('Mysterio')

async function init () {
  const mysterio = new Mysterio()
  try {
    const secrets = await mysterio.getMerged()
  } catch (e) {
    console.log('Error getting secrets ', e)
  }
}
```

4. You can also use Mysterio helper to just get secrets

```javascript
const { name } = require('package.json')
const { getSecretsClient } = require('Mysterio')

async function init () {
  const getSecrets = getSecretsClient({})
  try {
    const secrets = await getSecrets('my-secret-name')
  } catch (e) {
    console.log('Error getting secrets ', e)
  }
}
```

## API

### `new Mysterio([, options])`

* `awsParams` (Object) - AWS SecretManager constructor [params](ttps://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html#constructor-property). Default: `{ region: 'us-east-1' }`
* `configDirPath` (String) - config folder path. Default: `<current working dir>/config`
* `localRCPath` (String) - local rc file path. Default: `<current working dir>/.mysteriorc`
* `env` (String) - environment. Default: `process.env.NODE_ENV || 'local'`
* `packageName` (String) - name of your app
* `secretName` (String) - name of your secret. Default:  `${packageName}/${env}`

### `Mysterio.getDefaultConfigs()`

Get default configuration from `configDirPath` by `env`. If you have `default.json` file it will marge it with `<env>.json` file.

### `Mysterio.getSecrets()`

Get secrets from AWS SecretManager. Secret id will be `secretName`.

### `Mysterio.getLocalRC()`

Get configuration from `localRCPath`. This file will load last. It is usually used as a helper while developing services with this module. You can add it to your `.gitignore` file to make sure it will stay only on yor computer.

### `Mysterio.getMerged([, options])`

Get a merged secret object with your AWS SecretManager secret and your local config files.

* `isAddEnvProp` - add an env prop to the merged secrets in `is<Env> = true` pattern. Default: `false`
* `isGetLocal` - pull secrets from AWS SecretManager on `local` env as well. Default: `true`

#### `getSecretsClient([, options])`

Get secrets from AWS SecretManager by secret name. This method will return an async function that accepts a secret name and returns the secrets object.

* `awsParams` (Object) - AWS SecretManager constructor [params](ttps://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html#constructor-property). Default: `{ region: 'us-east-1' }`
