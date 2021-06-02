# Enconsec [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

A dead simple module to take a configuration file by environment, retrieve secrets from AWS secret manager and merge them.

## Install

```bash
> npm install --save enconsec
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
const Enconsec = require('Enconsec')

async function init () {
  const enconsec = new Enconsec()
  try {
    let secrets = await enconsec.getMerged()
  } catch (e) {
    console.log('Error getting secrets ', e)
  }
}
```

## API

### `new Enconsec([, options])`

* `awsParams` (Object) - AWS SecretManager constructor [params](ttps://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html#constructor-property). Default: `{ region: 'us-east-1' }`
* `configDirPath` (String) - config folder path. Default: `<current working dir>/config`
* `env` (String) - environment. Default: `process.env.NODE_ENV || 'local'`
* `packageName` (String) - name of your app
* `secretName` (String) - name of your secret. Default:  `${packageName}/${env}`

### `Enconsec.getDefaultConfigs()`

Get default configuration from `configDirPath` by `env`. If you have `default.json` file it will marge it with `<env>.json` file.

### `Enconsec.getSecrets()`

Get secrets from AWS SecretManager. Secret id will be `secretName`.

### `Enconsec.getMerged([, options])`

Get a merged secret object with your AWS SecretManager secret and your local config files.

* `isAddEnvProp` - add an env prop to the merged secrets in `is<Env> = true` pattern. Default: `false`
* `isGetLocal` - pull secrets from AWS SecretManager on `local` env as well. Default: `true`
