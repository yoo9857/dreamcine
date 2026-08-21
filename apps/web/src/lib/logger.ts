import { NotImplementedError } from '@aidream/core'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'

export type LogFields = Readonly<Record<string, unknown>>

export interface Logger {
  trace(fields: LogFields, message: string): void
  debug(fields: LogFields, message: string): void
  info(fields: LogFields, message: string): void
  warn(fields: LogFields, message: string): void
  error(fields: LogFields, message: string): void
}

/** pino JSON 로그. redact 목록은 07_AUTH_SECURITY.md §9 를 그대로 따른다. */
export function getLogger(): Logger {
  throw new NotImplementedError('T03:logger')
}
