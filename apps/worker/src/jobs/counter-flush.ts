import {
  applyClaimedEpisodeViews,
  purgeViewFlushReceiptsOlderThan,
  refreshWatchAveragesSince,
} from '@aidream/db'
import { getQueue, QUEUE } from '@aidream/queue'
import { randomUUID } from 'node:crypto'

export interface CounterFlushResult {
  readonly flushed: number
  readonly duplicates: number
}

export interface CounterFlushDependencies {
  readonly scanPending: (
    cursor: string,
  ) => Promise<{ cursor: string; keys: readonly string[] }>
  readonly scanFresh: (
    cursor: string,
  ) => Promise<{ cursor: string; keys: readonly string[] }>
  readonly readPending: (key: string) => Promise<string | null>
  readonly claim: (viewbufKey: string) => Promise<string | null>
  readonly apply: (
    episodeId: string,
    token: string,
    amount: bigint,
  ) => Promise<'applied' | 'duplicate'>
  readonly release: (pendingKey: string) => Promise<void>
  readonly refreshAverages?: (since: Date) => Promise<number>
  readonly purgeReceipts?: (olderThan: Date) => Promise<number>
}

const VIEWBUF_PREFIX = 'viewbuf:'
const VIEWPENDING_PREFIX = 'viewpending:'
const RECEIPT_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
const CLAIM_TOKEN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * 버퍼에 값이 있고 대기 키가 없을 때만 옮긴다.
 * 대기 키가 있으면 그 값을 그대로 돌려 주고, 새 버퍼는 다음 차례에 남긴다.
 * 반환이 없으면 버퍼가 비어 있는 것이다.
 */
const CLAIM_VIEW_SCRIPT = `
local pending = redis.call('GET', KEYS[2])
if pending then
  return pending
end
local count = redis.call('GETDEL', KEYS[1])
if not count then
  return false
end
redis.call('SET', KEYS[2], ARGV[1] .. ':' .. count)
return ARGV[1] .. ':' .. count
`

export function counterFlushJob(
  dependencies?: CounterFlushDependencies,
): Promise<CounterFlushResult> {
  return runCounterFlush(dependencies ?? productionDependencies())
}

async function runCounterFlush(
  dependencies: CounterFlushDependencies,
): Promise<CounterFlushResult> {
  const averagesSince = new Date(Date.now() - 2 * 60 * 1000)
  let flushed = 0
  let duplicates = 0
  let failure: unknown
  try {
    await drain(dependencies.scanPending, async (key) => {
      const episodeId = episodeIdFromKey(key, VIEWPENDING_PREFIX)
      const raw = await dependencies.readPending(key)
      if (raw === null) return
      const outcome = await commitClaim(dependencies, episodeId, raw)
      if (outcome === 'applied') flushed += 1
      if (outcome === 'duplicate') duplicates += 1
    })
    await drain(dependencies.scanFresh, async (key) => {
      const episodeId = episodeIdFromKey(key, VIEWBUF_PREFIX)
      const raw = await dependencies.claim(key)
      if (raw === null) return
      const outcome = await commitClaim(dependencies, episodeId, raw)
      if (outcome === 'applied') flushed += 1
      if (outcome === 'duplicate') duplicates += 1
    })
  } catch (error: unknown) {
    failure = error
  }
  if (dependencies.refreshAverages !== undefined) {
    try {
      await dependencies.refreshAverages(averagesSince)
    } catch (error: unknown) {
      if (failure === undefined) failure = error
    }
  }
  if (failure === undefined && dependencies.purgeReceipts !== undefined) {
    try {
      await dependencies.purgeReceipts(
        new Date(Date.now() - RECEIPT_RETENTION_MS),
      )
    } catch (error: unknown) {
      failure = error
    }
  }
  if (failure !== undefined) {
    if (failure instanceof Error) throw failure
    throw new Error('counter flush failed', { cause: failure })
  }
  return { flushed, duplicates }
}

async function drain(
  scan: CounterFlushDependencies['scanPending'],
  handle: (key: string) => Promise<void>,
): Promise<void> {
  let cursor = '0'
  do {
    const page = await scan(cursor)
    cursor = page.cursor
    for (const key of page.keys) {
      await handle(key)
    }
  } while (cursor !== '0')
}

/**
 * 반영에 실패하면 대기 키를 지우지 않는다. 버퍼로 되돌리면 다음 청구와 겹쳐
 * 같은 조회가 두 번 더해진다. 깨진 값만 지워서 분 작업이 그 키에 머물지 않게 한다.
 */
async function commitClaim(
  dependencies: CounterFlushDependencies,
  episodeId: string,
  raw: string,
): Promise<'applied' | 'duplicate' | 'dropped'> {
  const claim = parseClaimedViews(episodeId, raw)
  const pendingKey = `${VIEWPENDING_PREFIX}${episodeId}`
  if (claim === null) {
    await dependencies.release(pendingKey)
    return 'dropped'
  }
  const outcome = await dependencies.apply(
    claim.episodeId,
    claim.token,
    claim.amount,
  )
  await dependencies.release(pendingKey)
  return outcome
}

function parseClaimedViews(
  episodeId: string,
  raw: string,
): { episodeId: string; token: string; amount: bigint } | null {
  const splitAt = raw.indexOf(':')
  if (splitAt <= 0) return null
  const token = raw.slice(0, splitAt)
  const countRaw = raw.slice(splitAt + 1)
  if (!CLAIM_TOKEN.test(token)) return null
  if (!/^[1-9]\d*$/.test(countRaw)) return null
  return { episodeId, token, amount: BigInt(countRaw) }
}

function episodeIdFromKey(key: string, prefix: string): string {
  if (!key.startsWith(prefix)) throw new Error('unexpected view key')
  const episodeId = key.slice(prefix.length)
  if (episodeId.length === 0) throw new Error('unexpected view key')
  return episodeId
}

function productionDependencies(): CounterFlushDependencies {
  const queue = getQueue(QUEUE.COUNTER_FLUSH)
  return {
    scanPending: (cursor) => scan(queue, cursor, 'viewpending:*'),
    scanFresh: (cursor) => scan(queue, cursor, 'viewbuf:*'),
    readPending: async (key) => {
      const client = await queue.client
      return readRedisBulk(await client.runCommand('get', [key]))
    },
    claim: async (viewbufKey) => {
      const episodeId = episodeIdFromKey(viewbufKey, VIEWBUF_PREFIX)
      const client = await queue.client
      return readRedisBulk(
        await client.runCommand('eval', [
          CLAIM_VIEW_SCRIPT,
          '2',
          viewbufKey,
          `${VIEWPENDING_PREFIX}${episodeId}`,
          randomUUID(),
        ]),
      )
    },
    apply: (episodeId, token, amount) =>
      applyClaimedEpisodeViews({ token, episodeId, amount }),
    release: async (pendingKey) => {
      const client = await queue.client
      await client.runCommand('del', [pendingKey])
    },
    refreshAverages: refreshWatchAveragesSince,
    purgeReceipts: purgeViewFlushReceiptsOlderThan,
  }
}

async function scan(
  queue: ReturnType<typeof getQueue>,
  cursor: string,
  match: string,
): Promise<{ cursor: string; keys: readonly string[] }> {
  const client = await queue.client
  return parseScanReply(
    await client.runCommand('scan', [cursor, 'MATCH', match, 'COUNT', 100]),
  )
}

function readRedisBulk(reply: unknown): string | null {
  if (reply === null || reply === false) return null
  if (typeof reply === 'string') return reply
  throw new Error('unexpected Redis reply')
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
