import { describe, expect, it, vi } from 'vitest'

import { checkReadiness, type ReadyDependencies } from './ready'

function dependencies(): ReadyDependencies {
  return {
    db: vi.fn().mockResolvedValue('ok'),
    redis: vi.fn().mockResolvedValue('PONG'),
    storage: vi.fn().mockResolvedValue('ok'),
    queue: vi.fn().mockResolvedValue({ waiting: 0 }),
    mail: vi.fn().mockResolvedValue('ok'),
  }
}

describe('checkReadiness', () => {
  it('checks all dependencies in parallel', async () => {
    const deps = dependencies()
    await expect(checkReadiness(deps)).resolves.toEqual({
      status: 'ok',
      checks: {
        db: 'ok',
        redis: 'ok',
        storage: 'ok',
        queue: 'ok',
        mail: 'ok',
      },
    })
    expect(deps.queue).toHaveBeenCalledOnce()
  })

  it('reports the failed queue without hiding healthy dependencies', async () => {
    const deps = dependencies()
    vi.mocked(deps.queue).mockRejectedValue(new Error('redis down'))
    const result = await checkReadiness(deps)
    expect(result.status).toBe('degraded')
    expect(result.checks).toEqual({
      db: 'ok',
      redis: 'ok',
      storage: 'ok',
      queue: 'fail',
      mail: 'ok',
    })
  })

  it('reports missing production mail configuration', async () => {
    const deps = dependencies()
    vi.mocked(deps.mail).mockRejectedValue(new Error('mail missing'))

    const result = await checkReadiness(deps)

    expect(result.status).toBe('degraded')
    expect(result.checks.mail).toBe('fail')
  })
})
