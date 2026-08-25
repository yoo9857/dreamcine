import { NotImplementedError } from '@aidream/core'

export interface CounterReconcileResult {
  readonly examined: number
  readonly corrected: number
}

export function counterReconcileJob(
  _changedSince: Date,
): Promise<CounterReconcileResult> {
  throw new NotImplementedError('T10:counterReconcileJob')
}
