import { Queue, type ConnectionOptions } from 'bullmq'

import { JOB_SCHEMAS, type DefinedQueue, type JobPayload } from './jobs.js'

export interface EnqueueOptions {
  /**
   * 중복 발행을 막는 열쇠.
   *
   * BullMQ 는 같은 `jobId` 의 잡을 두 번 담지 않는다. 완료 요청이 네트워크
   * 재시도로 두 번 들어와도 트랜스코드는 한 번만 돈다 — 이것이 없으면
   * 같은 영상을 두 번 인코딩하고 비용이 두 배가 된다. (T05 §7 ★)
   */
  readonly jobId?: string
  /** 지연 발행 (ms). 예약 공개·복구 잡이 쓴다. */
  readonly delayMs?: number
  readonly attempts?: number
  readonly backoff?: number | { readonly type: string; readonly delay?: number }
}

/**
 * 완료된 잡을 얼마나 남길지.
 *
 * 전부 지우면 `jobId` 중복 방지가 **즉시 풀린다** — 완료 직후 같은 요청이
 * 다시 오면 새 잡이 된다. 한 시간은 남겨 재시도 구간을 덮는다.
 * 무한정 남기면 Redis 가 잡 기록으로 찬다.
 */
const REMOVE_ON_COMPLETE = { age: 3_600, count: 1_000 } as const

/** 실패는 더 오래 남긴다 — 사람이 원인을 볼 시간이 필요하다. */
const REMOVE_ON_FAIL = { age: 24 * 3_600 } as const

/**
 * `REDIS_URL` 을 BullMQ 연결 설정으로 옮긴다.
 *
 * `ioredis` 를 직접 쓰지 않는 이유: 그것은 bullmq 의 전이 의존이다.
 * 선언하지 않은 패키지를 import 하면 bullmq 가 판올림하면서 조용히 사라질 수
 * 있다. URL 을 우리가 풀어 넘기면 그 위험이 없다.
 */
function connectionFromUrl(raw: string): ConnectionOptions {
  const url = new URL(raw)
  const database = url.pathname.replace('/', '')
  return {
    host: url.hostname,
    port: url.port === '' ? 6379 : Number(url.port),
    ...(url.username === '' ? {} : { username: url.username }),
    ...(url.password === '' ? {} : { password: url.password }),
    ...(database === '' ? {} : { db: Number(database) }),
    /*
      BullMQ 는 블로킹 명령을 쓰므로 요청별 재시도 상한이 있으면 안 된다.
      워커 쪽 요구사항이지만 같은 설정을 쓰는 편이 헷갈리지 않는다.
    */
    maxRetriesPerRequest: null,
  }
}

function redisUrl(): string {
  const raw = process.env.REDIS_URL
  if (raw === undefined || raw === '') {
    throw new Error('REDIS_URL 이 없습니다')
  }
  return raw
}

const queues = new Map<DefinedQueue, Queue>()

/**
 * 큐 하나를 얻는다. 연결은 재사용한다 — 발행할 때마다 새로 열면 Redis
 * 커넥션이 요청 수만큼 쌓인다.
 */
export function getQueue(name: DefinedQueue): Queue {
  const existing = queues.get(name)
  if (existing !== undefined) {
    return existing
  }
  const created = new Queue(name, { connection: connectionFromUrl(redisUrl()) })
  queues.set(name, created)
  return created
}

/**
 * 타입 안전 발행.
 *
 * 페이로드는 **발행 시점에 검증한다.** 잘못된 모양이 큐에 들어가면 실패가
 * 워커 쪽에서, 그것도 몇 초 뒤에 나타난다 — 원인에서 먼 곳이다. 여기서 막으면
 * 호출한 자리에서 바로 드러난다.
 */
export async function enqueue<Q extends DefinedQueue>(
  name: Q,
  payload: JobPayload<Q>,
  options: EnqueueOptions = {},
): Promise<void> {
  const parsed = JOB_SCHEMAS[name].parse(payload)

  await getQueue(name).add(name, parsed, {
    ...(options.jobId === undefined ? {} : { jobId: options.jobId }),
    ...(options.delayMs === undefined ? {} : { delay: options.delayMs }),
    ...(options.attempts === undefined ? {} : { attempts: options.attempts }),
    ...(options.backoff === undefined ? {} : { backoff: options.backoff }),
    removeOnComplete: REMOVE_ON_COMPLETE,
    removeOnFail: REMOVE_ON_FAIL,
  })
}

/** 테스트와 종료 처리를 위해 열린 커넥션을 닫는다. */
export async function closeQueues(): Promise<void> {
  const open = [...queues.values()]
  queues.clear()
  await Promise.all(open.map((queue) => queue.close()))
}

export async function retryJob<Q extends DefinedQueue>(
  name: Q,
  jobId: string,
  payload: JobPayload<Q>,
): Promise<void> {
  const queue = getQueue(name)
  const existing = await queue.getJob(jobId)
  if (existing === undefined) {
    await enqueue(name, payload, {
      jobId,
      attempts: 3,
      backoff: { type: 'transcode' },
    })
    return
  }
  const state = await existing.getState()
  if (state === 'failed') {
    await existing.retry('failed')
  }
}

export { connectionFromUrl }
