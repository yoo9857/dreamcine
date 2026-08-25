import { pino, type DestinationStream, type LoggerOptions } from 'pino'

import { getRequestContext } from './request-context'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error'

export type LogFields = Readonly<Record<string, unknown>>

export interface Logger {
  trace(fields: LogFields, message: string): void
  debug(fields: LogFields, message: string): void
  info(fields: LogFields, message: string): void
  warn(fields: LogFields, message: string): void
  error(fields: LogFields, message: string): void
}

/**
 * 07_AUTH_SECURITY.md §9 의 목록 그대로. 이 배열을 줄이는 것은 하네스 위반이다.
 * 시크릿·토큰·서명URL 이 로그로 새는 경로를 기계적으로 막는다.
 */
export const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.secret',
  '*.accessKeyId',
  '*.secretAccessKey',
  '*.signedUrl',
  '*.url',
] as const

export const REDACT_CENSOR = '[REDACTED]'

const LOG_LEVELS: readonly LogLevel[] = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
]

function resolveLevel(): LogLevel {
  const raw = process.env.LOG_LEVEL
  return LOG_LEVELS.find((level) => level === raw) ?? 'info'
}

function options(): LoggerOptions {
  return {
    level: resolveLevel(),
    base: { service: 'web' },
    mixin: () => {
      const context = getRequestContext()
      return context === undefined
        ? {}
        : {
            requestId: context.requestId,
            ...(context.userId === undefined ? {} : { userId: context.userId }),
          }
    },
    redact: { paths: [...REDACT_PATHS], censor: REDACT_CENSOR },
  }
}

/** 테스트는 destination 을 주입해 출력을 검사한다. */
export function createLogger(destination?: DestinationStream): Logger {
  return destination === undefined
    ? pino(options())
    : pino(options(), destination)
}

let cached: Logger | undefined

export function getLogger(): Logger {
  cached ??= createLogger()
  return cached
}
