import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  cleanup: vi.fn().mockResolvedValue(1),
  close: vi.fn().mockResolvedValue(undefined),
  error: vi.fn(),
  on: vi.fn(),
  pause: vi.fn().mockResolvedValue(undefined),
  purge: vi.fn().mockResolvedValue(2),
  recover: vi.fn().mockResolvedValue(3),
  schedulerClose: vi.fn().mockResolvedValue(undefined),
  startScheduler: vi.fn(),
  transcode: vi.fn().mockResolvedValue('COMPLETED'),
  workers: [] as {
    name: string
    processor: (job: { data: unknown }) => Promise<unknown>
    options: Record<string, unknown>
  }[],
}))

vi.mock('bullmq', () => ({
  Worker: class {
    pause = mocks.pause
    close = mocks.close
    on = mocks.on

    constructor(
      name: string,
      processor: (job: { data: unknown }) => Promise<unknown>,
      options: Record<string, unknown>,
    ) {
      mocks.workers.push({ name, processor, options })
    }
  },
}))

vi.mock('pino', () => ({
  default: () => ({ error: mocks.error, fatal: vi.fn(), info: vi.fn() }),
}))

vi.mock('./config.js', () => ({
  loadWorkerConfig: () => ({
    env: { LOG_LEVEL: 'info', REDIS_URL: 'redis://localhost:6379' },
    capacity: { workerConcurrency: 2 },
    processRole: 'worker',
  }),
}))
vi.mock('./jobs/cleanup-orphans.js', () => ({
  cleanupOrphans: mocks.cleanup,
}))
vi.mock('./jobs/db-purge.js', () => ({ purgeDatabase: mocks.purge }))
vi.mock('./jobs/recover-stuck.js', () => ({ recoverStuck: mocks.recover }))
vi.mock('./jobs/transcode.js', () => ({
  processTranscodeJob: mocks.transcode,
}))
vi.mock('./scheduler.js', () => ({ startScheduler: mocks.startScheduler }))

const { bootstrapWorker, transcodeBackoff } = await import('./index.js')

beforeEach(() => {
  mocks.workers.length = 0
  mocks.pause.mockClear()
  mocks.close.mockClear()
  mocks.on.mockClear()
  mocks.error.mockClear()
  mocks.cleanup.mockClear()
  mocks.purge.mockClear()
  mocks.recover.mockClear()
  mocks.transcode.mockClear()
})

describe('transcodeBackoff', () => {
  it('첫 실패는 30초, 다음 실패는 2분을 기다린다', () => {
    expect(transcodeBackoff(1)).toBe(30_000)
    expect(transcodeBackoff(2)).toBe(120_000)
    expect(transcodeBackoff(3)).toBe(120_000)
  })
})

describe('bootstrapWorker', () => {
  it('네 큐를 올리고 트랜스코드 동시성과 재시도 정책을 적용한다', async () => {
    await bootstrapWorker()

    expect(mocks.workers.map(({ name }) => name)).toEqual([
      'video.transcode',
      'storage.cleanup',
      'asset.recoverStuck',
      'db.purge',
    ])
    expect(mocks.workers[0]?.options).toMatchObject({
      concurrency: 2,
      settings: { backoffStrategy: transcodeBackoff },
    })
    expect(
      mocks.workers.slice(1).map(({ options }) => options.concurrency),
    ).toEqual([1, 1, 1])
  })

  it('각 잡을 검증해 해당 처리기로 전달한다', async () => {
    await bootstrapWorker()

    await mocks.workers[0]?.processor({ data: { assetId: 'asset_1' } })
    await mocks.workers[1]?.processor({ data: { scope: 'staleUploads' } })
    await mocks.workers[2]?.processor({ data: { olderThanMinutes: 10 } })
    await mocks.workers[3]?.processor({ data: { dryRun: true } })

    const transcodeInput = mocks.transcode.mock.calls[0]?.[0] as {
      assetId: string
      signal: AbortSignal
    }
    const cleanupInput = mocks.cleanup.mock.calls[0]?.[0] as {
      scope: string
      now: Date
    }
    const purgeInput = mocks.purge.mock.calls[0]?.[0] as {
      dryRun: boolean
      now: Date
    }
    expect(transcodeInput.assetId).toBe('asset_1')
    expect(transcodeInput.signal).toBeInstanceOf(AbortSignal)
    expect(cleanupInput.scope).toBe('staleUploads')
    expect(cleanupInput.now).toBeInstanceOf(Date)
    expect(mocks.recover.mock.calls[0]?.[0]).toBe(10)
    expect(mocks.recover.mock.calls[0]?.[1]).toBeInstanceOf(Date)
    expect(purgeInput.dryRun).toBe(true)
    expect(purgeInput.now).toBeInstanceOf(Date)
  })

  it('종료는 수신 중단 후 실행 중 잡을 취소하고 워커를 한 번만 닫는다', async () => {
    const runtime = await bootstrapWorker()
    const transcodeWorker = mocks.workers[0]
    await runtime.close()
    await runtime.close()

    expect(mocks.pause).toHaveBeenCalledTimes(4)
    expect(mocks.close).toHaveBeenCalledTimes(4)
    expect(mocks.close).toHaveBeenCalledWith(true)

    await transcodeWorker?.processor({ data: { assetId: 'asset_1' } })
    const input = mocks.transcode.mock.calls[0]?.[0] as { signal: AbortSignal }
    expect(input.signal.aborted).toBe(true)
  })

  it('워커 오류를 구조화 로그로 남긴다', async () => {
    await bootstrapWorker()
    const listener = mocks.on.mock.calls.find(
      ([event]) => event === 'error',
    )?.[1] as ((error: Error) => void) | undefined
    const error = new Error('redis down')

    listener?.(error)

    expect(mocks.error).toHaveBeenCalledWith({ err: error }, 'worker error')
  })
})
