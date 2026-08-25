import pino, { type Logger } from 'pino'

export interface JobLogContext {
  readonly queue: string
  readonly jobId: string
  readonly attempt: number
  readonly requestId?: string | undefined
}

export function workerLogger(context?: JobLogContext): Logger {
  const logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: 'worker', ...(context ?? {}) },
    redact: {
      censor: '[REDACTED]',
      paths: [
        '*.password',
        '*.passwordHash',
        '*.token',
        '*.secret',
        '*.accessKeyId',
        '*.secretAccessKey',
        '*.signedUrl',
        '*.url',
      ],
    },
  })
  return logger
}
