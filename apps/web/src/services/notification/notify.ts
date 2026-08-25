import {
  NotificationPayloadSchema,
  type NotificationPayload,
} from '@aidream/core'
import { createNotification, hasBlockBetween } from '@aidream/db'

import { getRedis } from '@/src/lib/redis'

export type NotifyInput = NotificationPayload & { readonly to: string }

export interface NotifyDependencies {
  readonly blocked: typeof hasBlockBetween
  readonly reserve: (key: string, ttlSec: number) => Promise<boolean>
  readonly insert: typeof createNotification
}

function actorId(input: NotifyInput): string | null {
  return 'actorId' in input ? input.actorId : null
}

function targetId(input: NotifyInput): string {
  if ('commentId' in input) return input.commentId
  if ('episodeId' in input && input.episodeId !== undefined)
    return input.episodeId
  if ('seriesId' in input) return input.seriesId
  if ('assetId' in input) return input.assetId
  if ('targetId' in input) return input.targetId
  return actorId(input) ?? input.to
}

export async function notify(
  input: NotifyInput,
  dependencies: NotifyDependencies = {
    blocked: hasBlockBetween,
    reserve: (key, ttlSec) => getRedis().setIfAbsent(key, '1', ttlSec),
    insert: createNotification,
  },
): Promise<void> {
  const actor = actorId(input)
  if (actor === input.to) return
  if (actor !== null && (await dependencies.blocked(actor, input.to))) return

  if (input.type !== 'NEW_COMMENT') {
    const key = `notif:dedup:${input.to}:${input.type}:${actor ?? 'system'}:${targetId(input)}`
    if (!(await dependencies.reserve(key, 24 * 60 * 60))) return
  }

  const payload = NotificationPayloadSchema.parse(input)
  await dependencies.insert({ userId: input.to, payload })
}
