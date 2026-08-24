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
  const leader = await dependencies.acquire()
  if (leader) await dependencies.register()
  const refreshTimer = leader
    ? setInterval(() => {
        void dependencies.refresh()
      }, 20_000)
    : undefined
  refreshTimer?.unref()

  let closing: Promise<void> | undefined
  const handle: SchedulerHandle = {
    close: () => {
      closing ??= (async () => {
        if (refreshTimer !== undefined) clearInterval(refreshTimer)
        if (leader) await dependencies.release()
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
  const lockKey = 'scheduler:leader'
  const lockTtlSec = 60
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
