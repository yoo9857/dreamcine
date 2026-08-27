import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3'
import { checkDbHealth } from '@aidream/db'
import { getQueue, QUEUE } from '@aidream/queue'

import { getLogger } from '@/src/lib/logger'
import { mailTransportConfigured } from '@/src/lib/mail'
import { getRedis } from '@/src/lib/redis'

export type DependencyState = 'ok' | 'fail'

export interface ReadyChecks {
  db: DependencyState
  redis: DependencyState
  storage: DependencyState
  queue: DependencyState
  mail: DependencyState
}

export interface ReadyResult {
  status: 'ok' | 'degraded'
  checks: ReadyChecks
}

export interface ReadyDependencies {
  readonly db: () => Promise<unknown>
  readonly redis: () => Promise<unknown>
  readonly storage: () => Promise<unknown>
  readonly queue: () => Promise<unknown>
  readonly mail: () => Promise<unknown>
}

/** 의존 서비스 검사 타임아웃. 하나가 느려도 2초 안에 판정한다. */
export const READY_TIMEOUT_MS = 2000

function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value === '') {
    throw new Error(`missing environment variable: ${name}`)
  }
  return value
}

let s3Client: S3Client | undefined

function storage(): S3Client {
  s3Client ??= new S3Client({
    endpoint: requireEnv('S3_ENDPOINT'),
    region: requireEnv('S3_REGION'),
    credentials: {
      accessKeyId: requireEnv('S3_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('S3_SECRET_ACCESS_KEY'),
    },
    // Linode Object Storage 와 MinIO 모두 path-style 로 통일한다.
    forcePathStyle: true,
  })
  return s3Client
}

async function withTimeout<T>(work: Promise<T>, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`readiness probe timed out: ${label}`))
    }, READY_TIMEOUT_MS)
    timer.unref()
  })
  try {
    return await Promise.race([work, timeout])
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  }
}

async function probe(
  label: keyof ReadyChecks,
  work: () => Promise<unknown>,
): Promise<DependencyState> {
  try {
    await withTimeout(work(), label)
    return 'ok'
  } catch (error: unknown) {
    getLogger().warn(
      { err: error, dependency: label },
      'readiness probe failed',
    )
    return 'fail'
  }
}

/**
 * DB `select 1` · Redis `PING` · S3 `HeadBucket` 을 **병렬로** 확인한다.
 * 하나라도 실패하면 degraded 이며 라우트가 503 을 돌린다 — 배포 시 트래픽
 * 전환 판단에 쓰이므로 관대하게 통과시키지 않는다. (O01_DEPLOY.md)
 */
export async function checkReadiness(
  dependencies: ReadyDependencies = productionDependencies(),
): Promise<ReadyResult> {
  const [db, redis, objectStorage, queue, mail] = await Promise.all([
    probe('db', dependencies.db),
    probe('redis', dependencies.redis),
    probe('storage', dependencies.storage),
    probe('queue', dependencies.queue),
    probe('mail', dependencies.mail),
  ])

  const checks: ReadyChecks = {
    db,
    redis,
    storage: objectStorage,
    queue,
    mail,
  }
  const healthy = Object.values(checks).every((state) => state === 'ok')
  return { status: healthy ? 'ok' : 'degraded', checks }
}

function productionDependencies(): ReadyDependencies {
  return {
    db: () => checkDbHealth(READY_TIMEOUT_MS),
    redis: () => getRedis().ping(),
    storage: () =>
      storage().send(
        new HeadBucketCommand({ Bucket: requireEnv('S3_BUCKET_ORIGINALS') }),
      ),
    queue: () =>
      getQueue(QUEUE.VIDEO_TRANSCODE).getJobCounts(
        'waiting',
        'active',
        'failed',
      ),
    mail: () => {
      if (process.env.NODE_ENV === 'production' && !mailTransportConfigured()) {
        return Promise.reject(
          new Error('transactional mail transport is not configured'),
        )
      }
      return Promise.resolve()
    },
  }
}
