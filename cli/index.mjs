#!/usr/bin/env node

import { Command } from 'commander'
import { compareConfigs } from './commands/compare-configs.mjs'
import { compareSecret } from './commands/compare-secret.mjs'
import { generateTemplate } from './commands/generate-template.mjs'

export function createProgram() {
  const program = new Command()

  program.name('mysterio').description('CLI tools for Mysterio config management').version('1.0.0')

  program
    .command('compare-secret')
    .description('Find missing keys between AWS secret and local config placeholders')
    .option('-c, --config <path>', 'Local config file path (default: ./config/{env}.json)')
    .option('-s, --secret <name>', 'AWS secret name (default: {packageName}/{env})')
    .option('-e, --env <env>', 'Environment (default: NODE_ENV or "local")')
    .option('-r, --region <region>', 'AWS region', 'us-east-1')
    .option('-o, --output <format>', 'Output format: text or json', 'text')
    .action(async (options) => {
      const exitCode = await compareSecret(options)
      process.exit(exitCode)
    })

  program
    .command('generate-template')
    .description('Generate AWS secret template from <aws_secret_manager> placeholders')
    .option('-c, --config <path>', 'Local config file path (default: ./config/{env}.json)')
    .option('-e, --env <env>', 'Environment (default: NODE_ENV or "local")')
    .option('-o, --output <path>', 'Output file path (stdout if not specified)')
    .action(async (options) => {
      const exitCode = await generateTemplate(options)
      process.exit(exitCode)
    })

  program
    .command('compare-configs')
    .description('Compare two merged configs using superdiff')
    .requiredOption('--env1 <env>', 'First environment')
    .requiredOption('--env2 <env>', 'Second environment')
    .option('-d, --config-dir <path>', 'Config directory', './config')
    .option('-s, --secret <template>', 'Secret name template with {env} placeholder')
    .option('-r, --region <region>', 'AWS region', 'us-east-1')
    .option('--sources <sources>', 'Comma-separated merge sources', 'default,env,secrets')
    .option('-o, --output <format>', 'Output format: text or json', 'text')
    .action(async (options) => {
      const exitCode = await compareConfigs(options)
      process.exit(exitCode)
    })

  return program
}

createProgram().parse()
