import { incrementEpisodeViews } from '@aidream/db'
import { getQueue, QUEUE } from '@aidream/queue'

export interface CounterFlushResult {
  readonly flushed: number
  readonly restored: number
}

export interface CounterFlushDependencies {
  readonly scan: (
    cursor: string,
  ) => Promise<{ cursor: string; keys: readonly string[] }>
  readonly getdel: (key: string) => Promise<string | null>
  readonly restore: (key: string, by: number) => Promise<void>
  readonly increment: typeof incrementEpisodeViews
}

export function counterFlushJob(
  dependencies?: CounterFlushDependencies,
): Promise<CounterFlushResult> {
  return runCounterFlush(dependencies ?? productionDependencies())
}

async function runCounterFlush(
  dependencies: CounterFlushDependencies,
): Promise<CounterFlushResult> {
  let cursor = '0'
  let flushed = 0
  let restored = 0
  do {
    const page = await dependencies.scan(cursor)
    cursor = page.cursor
    for (const key of page.keys) {
      const raw = await dependencies.getdel(key)
      if (raw === null) continue
      const count = Number(raw)
      if (!Number.isSafeInteger(count) || count <= 0) continue
      const episodeId = key.slice('viewbuf:'.length)
      try {
        await dependencies.increment(episodeId, BigInt(count))
        flushed += 1
      } catch (error: unknown) {
        await dependencies.restore(key, count)
        restored += 1
        throw error
      }
    }
  } while (cursor !== '0')
  return { flushed, restored }
}

function productionDependencies(): CounterFlushDependencies {
  const queue = getQueue(QUEUE.COUNTER_FLUSH)
  return {
    scan: async (cursor) => {
      const client = await queue.client
      return parseScanReply(
        await client.runCommand('scan', [
          cursor,
          'MATCH',
          'viewbuf:*',
          'COUNT',
          100,
        ]),
      )
    },
    getdel: async (key) => {
      const client = await queue.client
      const reply: unknown = await client.runCommand('getdel', [key])
      if (reply === null || typeof reply === 'string') return reply
      throw new Error('unexpected GETDEL reply')
    },
    restore: async (key, by) => {
      const client = await queue.client
      await client.runCommand('incrby', [key, by])
    },
    increment: incrementEpisodeViews,
  }
}

function parseScanReply(reply: unknown): {
  cursor: string
  keys: readonly string[]
} {
  if (
    !Array.isArray(reply) ||
    reply.length !== 2 ||
    typeof reply[0] !== 'string' ||
    !Array.isArray(reply[1]) ||
    !reply[1].every((key: unknown) => typeof key === 'string')
  )
    throw new Error('unexpected SCAN reply')
  return { cursor: reply[0], keys: reply[1] }
}
