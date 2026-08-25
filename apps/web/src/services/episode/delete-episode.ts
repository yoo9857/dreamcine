import { AppError, can, checkEpisodeTransition } from '@aidream/core'
import { findEpisodeForTransition, transitionEpisode } from '@aidream/db'
import { QUEUE } from '@aidream/queue'

import type { RouteSession } from '@/src/auth/types'
import { enqueue } from '@/src/lib/enqueue'

export async function deleteEpisode(
  episodeId: string,
  session: RouteSession,
  now: Date,
): Promise<void> {
  const record = await findEpisodeForTransition(episodeId)
  if (record === null) throw new AppError('E_EPISODE_NOT_FOUND')
  const actor = {
    id: session.userId,
    role: session.user.role,
    status: session.user.status,
    emailVerified: session.user.emailVerified,
  }
  if (!can(actor, 'episode.remove', { ownerId: record.ownerId })) {
    throw new AppError('E_PERM_NOT_OWNER')
  }
  const verdict = checkEpisodeTransition({
    current: record.episode.status,
    next: 'REMOVED',
    assetStatus: record.assetStatus,
    aiDisclosure: record.episode.aiDisclosure,
    publishAt: record.episode.publishAt,
    publishedAt: record.episode.publishedAt,
    now,
    actor: {
      kind: 'USER',
      role: actor.role,
      isOwner: actor.id === record.ownerId,
    },
  })
  if (!verdict.ok) throw new AppError(verdict.code)
  await transitionEpisode(record.episode.id, 'REMOVED', verdict.patch)
  if (record.episode.assetId !== null) {
    await enqueue(
      QUEUE.EPISODE_MEDIA_DELETE,
      { assetId: record.episode.assetId },
      {
        jobId: `episode-media-delete-${record.episode.assetId}`,
        attempts: 3,
      },
    )
  }
}
