import { reconcileRecentCounters } from '@aidream/db'
import pino from 'pino'

export interface CounterReconcileResult {
  readonly examined: number
  readonly corrected: number
}

export interface CounterReconcileDependencies {
  readonly reconcile: typeof reconcileRecentCounters
  readonly warn: (
    fields: Readonly<Record<string, unknown>>,
    message: string,
  ) => void
}

export function counterReconcileJob(
  changedSince: Date,
  dependencies: CounterReconcileDependencies = {
    reconcile: reconcileRecentCounters,
    warn: (fields, message) => {
      pino().warn(fields, message)
    },
  },
): Promise<CounterReconcileResult> {
  return runCounterReconcile(changedSince, dependencies)
}

async function runCounterReconcile(
  changedSince: Date,
  dependencies: CounterReconcileDependencies,
): Promise<CounterReconcileResult> {
  const mismatches = await dependencies.reconcile(changedSince)
  for (const mismatch of mismatches) {
    dependencies.warn(
      { ...mismatch, metric: 'counter_reconcile_mismatch' },
      'counter mismatch corrected',
    )
  }
  return { examined: mismatches.length, corrected: mismatches.length }
}
