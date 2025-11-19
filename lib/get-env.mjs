import isString from 'lodash.isstring'
export function getEnv(env) {
  return isString(env) ? env : process.env.NODE_ENV || 'local'
}
