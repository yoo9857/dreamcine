import { AppError, type ErrorCode } from '@aidream/core'
import {
  createNotifications,
  findNotificationEpisode,
  findNotificationEpisodeOwner,
  listFollowerIds,
} from '@aidream/db'
import { createHash } from 'node:crypto'

export interface NotificationFanoutInput {
  readonly type: 'NEW_EPISODE'
  readonly episodeId: string
  readonly cursor?: string | undefined
}

export interface PublishFailedNotificationInput {
  readonly type: 'PUBLISH_FAILED'
  readonly episodeId: string
  readonly errorCode: ErrorCode
}

export interface NotificationFanoutResult {
  readonly created: number
  readonly nextCursor: string | null
}

export interface NotificationFanoutDependencies {
  readonly findEpisode: typeof findNotificationEpisode
  readonly followers: typeof listFollowerIds
  readonly insert: typeof createNotifications
}

export function notificationFanoutJob(
  input: NotificationFanoutInput,
  dependencies: NotificationFanoutDependencies = {
    findEpisode: findNotificationEpisode,
    followers: listFollowerIds,
    insert: createNotifications,
  },
): Promise<NotificationFanoutResult> {
  return runFanout(input, dependencies)
}

export async function processNotificationFanoutJob(
  input: NotificationFanoutInput | PublishFailedNotificationInput,
): Promise<NotificationFanoutResult> {
  if (input.type === 'NEW_EPISODE') return notificationFanoutJob(input)
  const ownerId = await findNotificationEpisodeOwner(input.episodeId)
  if (ownerId === null) throw new AppError('E_EPISODE_NOT_FOUND')
  const created = await createNotifications([
    {
      id: deterministicNotificationId(
        ownerId,
        `${input.episodeId}:${input.errorCode}`,
      ),
      userId: ownerId,
      payload: {
        type: 'PUBLISH_FAILED',
        episodeId: input.episodeId,
        errorCode: input.errorCode,
      },
    },
  ])
  return { created, nextCursor: null }
}

async function runFanout(
  input: NotificationFanoutInput,
  dependencies: NotificationFanoutDependencies,
): Promise<NotificationFanoutResult> {
  const episode = await dependencies.findEpisode(input.episodeId)
  if (episode === null) throw new AppError('E_EPISODE_NOT_FOUND')
  const page = await dependencies.followers({
    creatorId: episode.ownerId,
    limit: 1000,
    ...(input.cursor === undefined ? {} : { cursor: input.cursor }),
  })
  const created = await dependencies.insert(
    page.items.map((userId) => ({
      id: deterministicNotificationId(userId, episode.id),
      userId,
      payload: {
        type: 'NEW_EPISODE' as const,
        seriesId: episode.seriesId,
        episodeId: episode.id,
      },
    })),
  )
  return { created, nextCursor: page.nextCursor }
}

export function deterministicNotificationId(
  userId: string,
  episodeId: string,
): string {
  return `notif_${createHash('sha256').update(`${userId}:${episodeId}`).digest('hex').slice(0, 24)}`
}
