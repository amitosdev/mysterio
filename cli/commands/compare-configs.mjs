import path from 'node:path'
import { getObjectDiff } from '@donedeal0/superdiff'
import { Mysterio } from '../../lib/Mysterio.mjs'
import { formatDiffOutput, hasDifferences } from '../utils/format-diff-output.mjs'

export async function compareConfigs(options) {
  const { env1, env2, configDir, secret: secretTemplate, region, sources, output } = options

  try {
    const configDirPath = path.resolve(configDir)
    const mergingOrder = sources.split(',').map((s) => s.trim())

    const mysterioOpts1 = {
      configDirPath,
      env: env1,
      awsParams: { region }
    }

    const mysterioOpts2 = {
      configDirPath,
      env: env2,
      awsParams: { region }
    }

    if (secretTemplate) {
      mysterioOpts1.secretName = secretTemplate.replace('{env}', env1)
      mysterioOpts2.secretName = secretTemplate.replace('{env}', env2)
    }

    const mysterio1 = new Mysterio(mysterioOpts1)
    const mysterio2 = new Mysterio(mysterioOpts2)

    const [config1, config2] = await Promise.all([mysterio1.getMerged(mergingOrder), mysterio2.getMerged(mergingOrder)])

    const diff = getObjectDiff(config1, config2)

    if (output === 'json') {
      console.log(
        JSON.stringify({
          env1,
          env2,
          status: diff.status,
          diff: diff.diff
        })
      )
    } else {
      console.log(`Comparing configs: ${env1} vs ${env2}`)
      console.log(`Sources: ${mergingOrder.join(', ')}`)
      console.log('')
      console.log(formatDiffOutput(diff, env1, env2))
    }

    return hasDifferences(diff) ? 1 : 0
  } catch (err) {
    if (output === 'json') {
      console.log(JSON.stringify({ status: 'error', message: err.message }))
    } else {
      console.error(`Error: ${err.message}`)
    }
    return 2
  }
}
