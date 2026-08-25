import { describe, expect, it, vi } from 'vitest'

import { counterFlushJob, type CounterFlushDependencies } from './counter-flush'

function dependencies(): CounterFlushDependencies {
  return {
    scan: vi.fn().mockResolvedValue({ cursor: '0', keys: ['viewbuf:episode'] }),
    getdel: vi.fn().mockResolvedValue('7'),
    restore: vi.fn().mockResolvedValue(undefined),
    increment: vi.fn().mockResolvedValue(undefined),
  }
}

describe('counterFlushJob', () => {
  it('atomically takes buffered views and increments Postgres', async () => {
    const deps = dependencies()
    await expect(counterFlushJob(deps)).resolves.toEqual({
      flushed: 1,
      restored: 0,
    })
    expect(deps.increment).toHaveBeenCalledWith('episode', 7n)
    expect(deps.restore).not.toHaveBeenCalled()
  })

  it('restores the exact value when the database increment fails', async () => {
    const deps = dependencies()
    vi.mocked(deps.increment).mockRejectedValue(new Error('db down'))
    await expect(counterFlushJob(deps)).rejects.toThrow('db down')
    expect(deps.restore).toHaveBeenCalledWith('viewbuf:episode', 7)
  })
})
