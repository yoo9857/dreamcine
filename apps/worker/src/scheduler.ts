import { closeQueues, getQueue, QUEUE } from '@aidream/queue'
import { randomUUID } from 'node:crypto'

export interface SchedulerHandle {
  close(): Promise<void>
}

export interface SchedulerDependencies {
  readonly acquire: () => Promise<boolean>
  readonly register: () => Promise<void>
  readonly refresh: () => Promise<void>
  readonly release: () => Promise<void>
}

export interface FeedRankScheduleRegistrar {
  readonly register: (
    id: string,
    everyMs: number,
    data: { readonly scope: 'recent' | 'expired' },
  ) => Promise<void>
}

export async function registerFeedRankSchedules(
  registrar: FeedRankScheduleRegistrar,
): Promise<void> {
  await registrar.register(
    'feed-rank-recent-every-ten-minutes',
    10 * 60 * 1000,
    {
      scope: 'recent',
    },
  )
  await registrar.register('feed-rank-expired-daily', 24 * 60 * 60 * 1000, {
    scope: 'expired',
  })
}

export function startScheduler(
  signal?: AbortSignal,
  dependencies?: SchedulerDependencies,
): Promise<SchedulerHandle> {
  return runScheduler(signal, dependencies ?? productionDependencies())
}

async function runScheduler(
  signal: AbortSignal | undefined,
  dependencies: SchedulerDependencies,
): Promise<SchedulerHandle> {
  let leader = false
  let closed = false
  let refreshTimer: ReturnType<typeof setInterval> | undefined
  let retryTimer: ReturnType<typeof setInterval> | undefined
  let acquireAttempt: Promise<boolean> | undefined

  const tryAcquire = (): Promise<boolean> => {
    if (closed || leader) return Promise.resolve(leader)
    if (acquireAttempt !== undefined) return acquireAttempt
    acquireAttempt = (async () => {
      const acquired = await dependencies.acquire()
      if (!acquired) return false
      leader = true
      if (retryTimer !== undefined) clearInterval(retryTimer)
      try {
        await dependencies.register()
      } catch (error: unknown) {
        leader = false
        await dependencies.release()
        throw error
      }
      refreshTimer = setInterval(() => {
        void dependencies.refresh()
      }, 10_000)
      refreshTimer.unref()
      return true
    })().finally(() => {
      acquireAttempt = undefined
    })
    return acquireAttempt
  }

  const initialLeader = await tryAcquire()
  if (!initialLeader) {
    retryTimer = setInterval(() => {
      void tryAcquire()
    }, 10_000)
    retryTimer.unref()
  }

  let closing: Promise<void> | undefined
  const handle: SchedulerHandle = {
    close: () => {
      closing ??= (async () => {
        closed = true
        if (retryTimer !== undefined) clearInterval(retryTimer)
        if (refreshTimer !== undefined) clearInterval(refreshTimer)
        if (acquireAttempt !== undefined) await acquireAttempt
        if (leader) await dependencies.release()
        leader = false
      })()
      return closing
    },
  }
  signal?.addEventListener(
    'abort',
    () => {
      void handle.close()
    },
    { once: true },
  )
  return handle
}

function productionDependencies(): SchedulerDependencies {
  const queue = getQueue(QUEUE.STORAGE_CLEANUP)
  const token = randomUUID()
  const lockKey = 'sched:leader'
  const lockTtlSec = 30
  return {
    acquire: async () => {
      const client = await queue.client
      client.defineCommand('aidreamAcquireSchedulerLock', {
        numberOfKeys: 1,
        lua: "if redis.call('set', KEYS[1], ARGV[1], 'EX', ARGV[2], 'NX') then return 1 else return 0 end",
      })
      const result: unknown = await client.runCommand(
        'aidreamAcquireSchedulerLock',
        [lockKey, token, lockTtlSec],
      )
      return result === 1
    },
    register: async () => {
      const cleanup = getQueue(QUEUE.STORAGE_CLEANUP)
      await cleanup.upsertJobScheduler(
        'storage-stale-hourly',
        { every: 60 * 60 * 1000 },
        { name: QUEUE.STORAGE_CLEANUP, data: { scope: 'staleUploads' } },
      )
      await cleanup.upsertJobScheduler(
        'storage-orphans-daily',
        { every: 24 * 60 * 60 * 1000 },
        { name: QUEUE.STORAGE_CLEANUP, data: { scope: 'orphanAssets' } },
      )
      await cleanup.upsertJobScheduler(
        'storage-failed-daily',
        { every: 24 * 60 * 60 * 1000 },
        { name: QUEUE.STORAGE_CLEANUP, data: { scope: 'failedOriginals' } },
      )
      await getQueue(QUEUE.RECOVER_STUCK).upsertJobScheduler(
        'assets-stuck-every-five-minutes',
        { every: 5 * 60 * 1000 },
        {
          name: QUEUE.RECOVER_STUCK,
          data: { olderThanMinutes: 10 },
        },
      )
      await getQueue(QUEUE.DB_PURGE).upsertJobScheduler(
        'database-purge-daily',
        { every: 24 * 60 * 60 * 1000 },
        {
          name: QUEUE.DB_PURGE,
          data: { dryRun: process.env.DRY_RUN === 'true' },
        },
      )
      await getQueue(QUEUE.EPISODE_PUBLISH).upsertJobScheduler(
        'episodes-publish-every-minute',
        { every: 60 * 1000 },
        { name: QUEUE.EPISODE_PUBLISH, data: {} },
      )
      const rankQueue = getQueue(QUEUE.FEED_RANK)
      await registerFeedRankSchedules({
        register: async (id, everyMs, data) => {
          await rankQueue.upsertJobScheduler(
            id,
            { every: everyMs },
            { name: QUEUE.FEED_RANK, data },
          )
        },
      })
    },
    refresh: async () => {
      const client = await queue.client
      client.defineCommand('aidreamRefreshSchedulerLock', {
        numberOfKeys: 1,
        lua: "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('expire', KEYS[1], ARGV[2]) else return 0 end",
      })
      await client.runCommand('aidreamRefreshSchedulerLock', [
        lockKey,
        token,
        lockTtlSec,
      ])
    },
    release: async () => {
      const client = await queue.client
      client.defineCommand('aidreamReleaseSchedulerLock', {
        numberOfKeys: 1,
        lua: "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
      })
      await client.runCommand('aidreamReleaseSchedulerLock', [lockKey, token])
      await closeQueues()
    },
  }
}
