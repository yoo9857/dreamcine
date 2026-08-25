import { NotImplementedError } from '@aidream/core'

export interface CounterFlushResult {
  readonly flushed: number
  readonly restored: number
}

export function counterFlushJob(): Promise<CounterFlushResult> {
  throw new NotImplementedError('T10:counterFlushJob')
}
