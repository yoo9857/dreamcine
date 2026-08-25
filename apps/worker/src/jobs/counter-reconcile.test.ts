import { describe, expect, it, vi } from 'vitest'

import {
  counterReconcileJob,
  type CounterReconcileDependencies,
} from './counter-reconcile'

describe('counterReconcileJob', () => {
  it('reports every corrected mismatch', async () => {
    const deps: CounterReconcileDependencies = {
      reconcile: vi.fn().mockResolvedValue([
        {
          entity: 'episode',
          id: 'ep',
          field: 'likeCount',
          stored: '2',
          actual: '3',
        },
      ]),
      warn: vi.fn(),
    }
    await expect(counterReconcileJob(new Date(), deps)).resolves.toEqual({
      examined: 1,
      corrected: 1,
    })
    expect(deps.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        metric: 'counter_reconcile_mismatch',
        id: 'ep',
      }),
      'counter mismatch corrected',
    )
  })

  it('is quiet when counters already match', async () => {
    const deps: CounterReconcileDependencies = {
      reconcile: vi.fn().mockResolvedValue([]),
      warn: vi.fn(),
    }
    await expect(counterReconcileJob(new Date(), deps)).resolves.toEqual({
      examined: 0,
      corrected: 0,
    })
    expect(deps.warn).not.toHaveBeenCalled()
  })
})
