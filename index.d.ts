import type { SecretsManagerClientConfig } from '@aws-sdk/client-secrets-manager'

/**
 * Configuration options for creating a Mysterio instance
 */
export interface MysterioOptions {
  /**
   * Path to config directory
   * @default './config'
   */
  configDirPath?: string

  /**
   * Path to local RC file
   * @default './.mysteriorc'
   */
  localRcPath?: string

  /**
   * Custom AWS secret name
   * @default '{package-name}/{NODE_ENV || 'local'}'
   */
  secretName?: string

  /**
   * Override environment name instead of using NODE_ENV
   * Affects both config file selection and secret name generation
   */
  env?: string

  /**
   * AWS SDK parameters for Secrets Manager client
   */
  awsParams?: SecretsManagerClientConfig

  /**
   * Custom client function for fetching secrets
   * @param secretName - The name of the secret to fetch
   * @returns Promise resolving to the secret object
   */
  client?: (secretName: string) => Promise<Record<string, unknown>>
}

/**
 * Valid source types for merging configurations
 */
export type MergingSource = 'default' | 'env' | 'secrets' | 'rc'

/**
 * Unified configuration management for Node.js applications
 *
 * Mysterio combines your local config files and AWS Secrets Manager into a single,
 * easy-to-use configuration object. It supports multiple configuration sources
 * that are merged intelligently at runtime.
 *
 * @example
 * ```typescript
 * import { Mysterio } from 'mysterio'
 *
 * const mysterio = new Mysterio({
 *   configDirPath: './config',
 *   env: 'production'
 * })
 *
 * const config = await mysterio.getMerged()
 * console.log(config.database.host)
 * ```
 */
export class Mysterio {
  /**
   * Creates a new Mysterio instance
   *
   * @param options - Configuration options
   *
   * @example
   * ```typescript
   * const mysterio = new Mysterio({
   *   configDirPath: './my-configs',
   *   localRcPath: './.myapprc',
   *   secretName: 'custom-secret-name',
   *   env: 'staging',
   *   awsParams: {
   *     region: 'us-west-2'
   *   }
   * })
   * ```
   */
  constructor(options?: MysterioOptions)

  /**
   * Returns the default config from config/default.json
   *
   * @returns Promise resolving to the default configuration object
   *
   * @example
   * ```typescript
   * const defaultConfig = await mysterio.getDefaultConfig()
   * console.log(defaultConfig)
   * ```
   */
  getDefaultConfig(): Promise<Record<string, unknown>>

  /**
   * Returns environment-specific config based on NODE_ENV or the env constructor option
   * For example, if NODE_ENV=production, loads config/production.json
   *
   * @returns Promise resolving to the environment configuration object
   *
   * @example
   * ```typescript
   * const envConfig = await mysterio.getEnvConfigs()
   * console.log(envConfig)
   * ```
   */
  getEnvConfigs(): Promise<Record<string, unknown>>

  /**
   * Returns local RC file config from .mysteriorc
   *
   * @returns Promise resolving to the RC configuration object
   *
   * @example
   * ```typescript
   * const rcConfig = await mysterio.getRcConfigs()
   * console.log(rcConfig)
   * ```
   */
  getRcConfigs(): Promise<Record<string, unknown>>

  /**
   * Returns secrets from AWS Secrets Manager
   *
   * @param unflatten - Whether to unflatten dotted keys into nested objects
   * @default false
   * @returns Promise resolving to the secrets object
   *
   * @example
   * ```typescript
   * // Get secrets as flat key-value pairs
   * const secrets = await mysterio.getSecrets(false)
   * // { 'database.password': 'secret', 'database.username': 'user' }
   *
   * // Get secrets with dotted keys unflattened into nested objects
   * const secrets = await mysterio.getSecrets(true)
   * // { database: { password: 'secret', username: 'user' } }
   * ```
   */
  getSecrets(unflatten?: boolean): Promise<Record<string, unknown>>

  /**
   * Returns the merged configuration object from multiple sources
   *
   * @param mergingOrder - Custom merge order (later sources override earlier ones)
   * @default ['default', 'env', 'secrets', 'rc']
   * @param unflattenSecrets - Whether to unflatten dotted secret keys into nested objects
   * @default true
   * @returns Promise resolving to the merged configuration object
   *
   * @example
   * ```typescript
   * // Default order with unflattened secrets
   * const config = await mysterio.getMerged()
   *
   * // Custom order - secrets override everything
   * const config = await mysterio.getMerged(['default', 'env', 'rc', 'secrets'])
   *
   * // Partial config - only default and env
   * const config = await mysterio.getMerged(['default', 'env'])
   *
   * // With flat secrets (not unflattened)
   * const config = await mysterio.getMerged(['default', 'env', 'secrets', 'rc'], false)
   * ```
   */
  getMerged(mergingOrder?: MergingSource[], unflattenSecrets?: boolean): Promise<Record<string, unknown>>
}

/**
 * Creates an AWS Secrets Manager client function
 *
 * @param awsParams - AWS SDK parameters for Secrets Manager client
 * @returns A client function that fetches secrets from AWS
 *
 * @example
 * ```typescript
 * import { getAwsSecretsClient } from 'mysterio'
 *
 * const client = getAwsSecretsClient({
 *   region: 'us-west-2'
 * })
 *
 * const secrets = await client('myapp/production')
 * ```
 */
export function getAwsSecretsClient(
  awsParams?: SecretsManagerClientConfig
): (secretName: string) => Promise<Record<string, unknown>>

/**
 * Reads and parses a JSON config file
 *
 * @param filePath - Path to the config file
 * @returns Promise resolving to the parsed config object, or empty object if file doesn't exist
 *
 * @example
 * ```typescript
 * import { getConfigsFromFile } from 'mysterio'
 *
 * const config = await getConfigsFromFile('./config/production.json')
 * console.log(config)
 * ```
 */
export function getConfigsFromFile(filePath: string): Promise<Record<string, unknown>>
