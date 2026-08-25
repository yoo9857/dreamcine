import { AppError } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import {
  withJob,
  type JobWrapperDependencies,
  type ObservableJob,
} from './job-wrapper.js'

interface TestLogger {
  readonly info: ReturnType<typeof vi.fn>
  readonly warn: ReturnType<typeof vi.fn>
  readonly error: ReturnType<typeof vi.fn>
  readonly debug: ReturnType<typeof vi.fn>
}

function dependencies(): JobWrapperDependencies & {
  readonly metrics: {
    duration: ReturnType<typeof vi.fn>
    total: ReturnType<typeof vi.fn>
    dlq: ReturnType<typeof vi.fn>
  }
  readonly log: TestLogger
} {
  const log = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
  let now = 1_000
  return {
    now: () => {
      now += 250
      return now
    },
    metrics: { duration: vi.fn(), total: vi.fn(), dlq: vi.fn() },
    logger: vi.fn(() => log),
    log,
  }
}

function job(
  attemptsMade = 0,
  attempts = 3,
): ObservableJob<{ id: string; requestId?: string }> {
  return {
    data: { id: 'asset_1' },
    id: 'job_1',
    queueName: 'video.transcode',
    attemptsMade,
    opts: { attempts },
  }
}

describe('withJob', () => {
  it('records total and duration for a successful job', async () => {
    const deps = dependencies()
    const handler = vi.fn().mockResolvedValue('done')
    await expect(
      withJob('video.transcode', handler, deps)(job()),
    ).resolves.toBe('done')
    expect(handler).toHaveBeenCalledWith(
      { id: 'asset_1' },
      { queue: 'video.transcode', jobId: 'job_1', attempt: 1 },
      expect.objectContaining({
        data: { id: 'asset_1' },
        id: 'job_1',
        queueName: 'video.transcode',
      }),
    )
    expect(deps.metrics.total).toHaveBeenCalledWith(
      'video.transcode',
      'success',
      'none',
    )
    expect(deps.metrics.duration).toHaveBeenCalledWith(
      'video.transcode',
      'success',
      0.25,
    )
  })

  it('adds a propagated request ID to handler and logger context', async () => {
    const deps = dependencies()
    const handler = vi.fn().mockResolvedValue('done')
    const tracedJob = job()
    tracedJob.data.requestId = 'req_123'

    await withJob('video.transcode', handler, deps)(tracedJob)

    const context = {
      queue: 'video.transcode',
      jobId: 'job_1',
      attempt: 1,
      requestId: 'req_123',
    }
    expect(deps.logger).toHaveBeenCalledWith(context)
    expect(handler).toHaveBeenCalledWith(tracedJob.data, context, tracedJob)
  })

  it('labels AppError and increments DLQ on the final attempt', async () => {
    const deps = dependencies()
    const error = new AppError('E_MEDIA_TRANSCODE_TIMEOUT')
    const wrapped = withJob(
      'video.transcode',
      vi.fn().mockRejectedValue(error),
      deps,
    )
    await expect(wrapped(job(2, 3))).rejects.toBe(error)
    expect(deps.metrics.total).toHaveBeenCalledWith(
      'video.transcode',
      'failed',
      'E_MEDIA_TRANSCODE_TIMEOUT',
    )
    expect(deps.metrics.dlq).toHaveBeenCalledWith('video.transcode')
    expect(vi.mocked(deps.log.error).mock.calls.length).toBeGreaterThan(0)
  })

  it('does not let metric collection failure block the job', async () => {
    const deps = dependencies()
    deps.metrics.total.mockImplementation(() => {
      throw new Error('metrics down')
    })
    await expect(
      withJob('queue', vi.fn().mockResolvedValue('ok'), deps)(job()),
    ).resolves.toBe('ok')
    expect(vi.mocked(deps.log.debug).mock.calls.length).toBeGreaterThan(0)
  })
})
