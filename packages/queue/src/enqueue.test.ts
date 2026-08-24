import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  add: vi.fn<
    (name: string, data: unknown, opts: unknown) => Promise<unknown>
  >(),
  close: vi.fn<() => Promise<void>>(),
  getJob: vi.fn<(id: string) => Promise<unknown>>(),
  getState: vi.fn<() => Promise<string>>(),
  retry: vi.fn<(state: 'failed') => Promise<void>>(),
  constructed: [] as { name: string; options: unknown }[],
}))

vi.mock('bullmq', () => ({
  Queue: class {
    constructor(name: string, options: unknown) {
      mocks.constructed.push({ name, options })
    }
    add = mocks.add
    close = mocks.close
    getJob = mocks.getJob
  },
}))

const { QUEUE } = await import('./queues.js')
const { closeQueues, connectionFromUrl, enqueue, getQueue, retryJob } =
  await import('./enqueue.js')

/** 완료 잡 보존 설정의 모양. `expect.anything()` 은 any 라 린트에 걸린다. */
const REMOVE_ON_COMPLETE_SHAPE = { age: 3_600, count: 1_000 }

const savedRedisUrl = process.env.REDIS_URL

beforeEach(() => {
  process.env.REDIS_URL = 'redis://127.0.0.1:6379'
  mocks.add.mockReset()
  mocks.add.mockResolvedValue({})
  mocks.close.mockReset()
  mocks.close.mockResolvedValue(undefined)
  mocks.getJob.mockReset()
  mocks.getJob.mockResolvedValue(undefined)
  mocks.getState.mockReset()
  mocks.getState.mockResolvedValue('failed')
  mocks.retry.mockReset()
  mocks.retry.mockResolvedValue(undefined)
  mocks.constructed.length = 0
})

afterEach(async () => {
  await closeQueues()
  if (savedRedisUrl === undefined) {
    Reflect.deleteProperty(process.env, 'REDIS_URL')
  } else {
    process.env.REDIS_URL = savedRedisUrl
  }
})

describe('connectionFromUrl', () => {
  it('호스트와 포트를 푼다', () => {
    expect(connectionFromUrl('redis://cache.internal:6380')).toMatchObject({
      host: 'cache.internal',
      port: 6380,
    })
  })

  it('포트가 없으면 6379 다', () => {
    expect(connectionFromUrl('redis://cache')).toMatchObject({ port: 6379 })
  })

  it('자격증명을 옮긴다', () => {
    expect(connectionFromUrl('redis://user:pw@cache:6379')).toMatchObject({
      username: 'user',
      password: 'pw',
    })
  })

  it('자격증명이 없으면 키를 넣지 않는다', () => {
    // 빈 문자열을 넘기면 ioredis 가 AUTH 를 시도해 거부당한다.
    const connection = connectionFromUrl('redis://cache:6379')

    expect(connection).not.toHaveProperty('username')
    expect(connection).not.toHaveProperty('password')
  })

  it('DB 번호를 옮긴다', () => {
    expect(connectionFromUrl('redis://cache:6379/3')).toMatchObject({ db: 3 })
  })

  it('블로킹 명령을 위해 요청 재시도 상한을 없앤다', () => {
    // BullMQ 는 블로킹 명령을 쓴다. 상한이 있으면 워커가 조용히 멈춘다.
    expect(connectionFromUrl('redis://cache')).toMatchObject({
      maxRetriesPerRequest: null,
    })
  })
})

describe('getQueue', () => {
  it('같은 큐는 인스턴스를 재사용한다', () => {
    // 발행할 때마다 새로 열면 Redis 커넥션이 요청 수만큼 쌓인다.
    expect(getQueue(QUEUE.VIDEO_TRANSCODE)).toBe(
      getQueue(QUEUE.VIDEO_TRANSCODE),
    )
    expect(mocks.constructed).toHaveLength(1)
  })

  it('다른 큐는 다른 인스턴스다', () => {
    getQueue(QUEUE.VIDEO_TRANSCODE)
    getQueue(QUEUE.VIDEO_THUMBNAIL)

    expect(mocks.constructed.map((entry) => entry.name)).toEqual([
      'video.transcode',
      'video.thumbnail',
    ])
  })

  it('REDIS_URL 이 없으면 던진다', () => {
    Reflect.deleteProperty(process.env, 'REDIS_URL')

    expect(() => getQueue(QUEUE.VIDEO_TRANSCODE)).toThrow('REDIS_URL')
  })
})

describe('enqueue', () => {
  it('검증한 페이로드를 발행한다', async () => {
    await enqueue(QUEUE.VIDEO_TRANSCODE, { assetId: 'ast_1' })

    expect(mocks.add).toHaveBeenCalledWith(
      'video.transcode',
      { assetId: 'ast_1' },
      expect.objectContaining({
        removeOnComplete: REMOVE_ON_COMPLETE_SHAPE,
      }),
    )
  })

  it('잘못된 페이로드를 발행 전에 거부한다', async () => {
    // 큐에 들어간 뒤에 실패하면 원인에서 먼 곳에서 드러난다.
    await expect(
      // @ts-expect-error 런타임 검증이 타입 밖의 입력도 막는지 확인한다.
      enqueue(QUEUE.VIDEO_TRANSCODE, { assetId: 123 }),
    ).rejects.toThrow()
    expect(mocks.add).not.toHaveBeenCalled()
  })

  it('빈 assetId 를 거부한다', async () => {
    await expect(
      enqueue(QUEUE.VIDEO_TRANSCODE, { assetId: '' }),
    ).rejects.toThrow()
    expect(mocks.add).not.toHaveBeenCalled()
  })

  it('스키마 밖의 필드를 실어 보내지 않는다', async () => {
    // 페이로드가 커지면 Redis 가 잡 데이터로 찬다.
    await enqueue(QUEUE.VIDEO_TRANSCODE, {
      assetId: 'ast_1',
      // @ts-expect-error 스키마에 없는 필드
      title: '드라마 1화',
    })

    expect(mocks.add).toHaveBeenCalledWith(
      'video.transcode',
      { assetId: 'ast_1' },
      expect.anything(),
    )
  })

  it('jobId 로 중복 발행을 막는다', async () => {
    // 완료 요청이 재시도로 두 번 와도 트랜스코드는 한 번만 돌아야 한다.
    await enqueue(
      QUEUE.VIDEO_TRANSCODE,
      { assetId: 'ast_1' },
      {
        jobId: 'ast_1',
      },
    )

    expect(mocks.add).toHaveBeenCalledWith(
      'video.transcode',
      { assetId: 'ast_1' },
      expect.objectContaining({ jobId: 'ast_1' }),
    )
  })

  it('완료된 잡을 일정 시간 남긴다 (jobId 중복 방지가 풀리지 않게)', async () => {
    await enqueue(QUEUE.VIDEO_TRANSCODE, { assetId: 'ast_1' })

    const options = mocks.add.mock.calls[0]?.[2] as {
      removeOnComplete: { age: number }
    }
    expect(options.removeOnComplete.age).toBeGreaterThanOrEqual(3_600)
  })

  it('지연과 재시도 횟수를 넘긴다', async () => {
    await enqueue(
      QUEUE.RECOVER_STUCK,
      { olderThanMinutes: 10 },
      {
        delayMs: 5_000,
        attempts: 3,
        backoff: { type: 'transcode' },
      },
    )

    expect(mocks.add).toHaveBeenCalledWith(
      'asset.recoverStuck',
      { olderThanMinutes: 10 },
      expect.objectContaining({
        delay: 5_000,
        attempts: 3,
        backoff: { type: 'transcode' },
      }),
    )
  })

  it('옵션을 주지 않으면 그 키를 넣지 않는다', async () => {
    await enqueue(QUEUE.VIDEO_TRANSCODE, { assetId: 'ast_1' })

    const options = mocks.add.mock.calls[0]?.[2] as Record<string, unknown>
    expect(options).not.toHaveProperty('jobId')
    expect(options).not.toHaveProperty('delay')
    expect(options).not.toHaveProperty('backoff')
  })
})

describe('closeQueues', () => {
  it('열린 큐를 모두 닫는다', async () => {
    getQueue(QUEUE.VIDEO_TRANSCODE)
    getQueue(QUEUE.VIDEO_THUMBNAIL)

    await closeQueues()

    expect(mocks.close).toHaveBeenCalledTimes(2)
  })

  it('닫은 뒤에는 새로 만든다', async () => {
    getQueue(QUEUE.VIDEO_TRANSCODE)
    await closeQueues()
    getQueue(QUEUE.VIDEO_TRANSCODE)

    expect(mocks.constructed).toHaveLength(2)
  })
})

describe('retryJob', () => {
  it('기존 실패 잡은 같은 jobId로 retry한다', async () => {
    mocks.getJob.mockResolvedValue({
      getState: mocks.getState,
      retry: mocks.retry,
    })

    await retryJob(QUEUE.VIDEO_TRANSCODE, 'asset_1', { assetId: 'asset_1' })

    expect(mocks.retry).toHaveBeenCalledWith('failed')
    expect(mocks.add).not.toHaveBeenCalled()
  })

  it('기존 잡이 없으면 같은 jobId로 새로 발행한다', async () => {
    await retryJob(QUEUE.VIDEO_TRANSCODE, 'asset_2', { assetId: 'asset_2' })

    expect(mocks.add).toHaveBeenCalledWith(
      QUEUE.VIDEO_TRANSCODE,
      { assetId: 'asset_2' },
      expect.objectContaining({
        jobId: 'asset_2',
        attempts: 3,
        backoff: { type: 'transcode' },
      }),
    )
  })

  it('이미 대기·실행 중인 잡은 중복 발행하지 않는다', async () => {
    mocks.getState.mockResolvedValue('active')
    mocks.getJob.mockResolvedValue({
      getState: mocks.getState,
      retry: mocks.retry,
    })

    await retryJob(QUEUE.VIDEO_TRANSCODE, 'asset_3', { assetId: 'asset_3' })

    expect(mocks.retry).not.toHaveBeenCalled()
    expect(mocks.add).not.toHaveBeenCalled()
  })
})
