import { createHmac } from 'node:crypto'
import { AppError } from '@aidream/core'
import { findPlaybackEpisode } from '@aidream/db'
import type { RouteSession } from '@/src/auth/types'
import { getRedis } from '@/src/lib/redis'

export interface CountViewInput {
  readonly episodeId: string
  readonly session: RouteSession | null
  readonly ip: string
  readonly now: Date
}
export async function countView(input: CountViewInput): Promise<void> {
  if ((await findPlaybackEpisode(input.episodeId)) === null)
    throw new AppError('E_EPISODE_NOT_FOUND')
  const identity = input.session?.userId ?? hashIp(input.ip, requiredSecret())
  const day = input.now.toISOString().slice(0, 10).replaceAll('-', '')
  const redis = getRedis()
  const added = await redis.setIfAbsent(
    `view:${input.episodeId}:${identity}:${day}`,
    '1',
    86_400,
  )
  if (added) await redis.incr(`viewbuf:${input.episodeId}`)
}
export function hashIp(ip: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`aidream-view-ip-v1:${ip}`)
    .digest('hex')
}
function requiredSecret(): string {
  const secret = process.env.AUTH_SECRET
  if (secret === undefined || secret === '') throw new AppError('E_INTERNAL')
  return secret
}
