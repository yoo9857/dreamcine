import { NotImplementedError } from '@aidream/core'
import type { Logger } from 'pino'

export interface JobLogContext {
  readonly queue: string
  readonly jobId: string
  readonly attempt: number
}

export function workerLogger(context?: JobLogContext): Logger {
  void context
  throw new NotImplementedError('T11:workerLogger')
}
