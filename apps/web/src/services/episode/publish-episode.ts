import {
  AppError,
  can,
  checkEpisodeTransition,
  type EpisodeStatus,
  type PublishEpisodeInput,
  type PublishEpisodeResponse,
  type TransitionActor,
} from '@aidream/core'
import { findEpisodeForTransition, transitionEpisode } from '@aidream/db'
import { QUEUE } from '@aidream/queue'

import type { RouteSession } from '@/src/auth/types'
import { enqueue } from '@/src/lib/enqueue'

export interface PublishEpisodeServiceInput {
  readonly episodeId: string
  readonly session: RouteSession
  readonly request: PublishEpisodeInput
  readonly now: Date
}

export function publishEpisode(
  input: PublishEpisodeServiceInput,
): Promise<PublishEpisodeResponse> {
  return runPublishEpisode(input)
}

const NEXT_STATUS: Record<PublishEpisodeInput['action'], EpisodeStatus> = {
  PUBLISH: 'PUBLISHED',
  SCHEDULE: 'SCHEDULED',
  HIDE: 'HIDDEN',
  UNHIDE: 'PUBLISHED',
}

async function runPublishEpisode(
  input: PublishEpisodeServiceInput,
): Promise<PublishEpisodeResponse> {
  const record = await findEpisodeForTransition(input.episodeId)
  if (record === null) throw new AppError('E_EPISODE_NOT_FOUND')
  const actor = {
    id: input.session.userId,
    role: input.session.user.role,
    status: input.session.user.status,
    emailVerified: input.session.user.emailVerified,
  }
  const action =
    input.request.action === 'HIDE' ? 'episode.hide' : 'episode.publish'
  if (!can(actor, action, { ownerId: record.ownerId })) {
    throw new AppError('E_PERM_NOT_OWNER')
  }
  const transitionActor: TransitionActor = {
    kind: 'USER',
    role: actor.role,
    isOwner: actor.id === record.ownerId,
  }
  const next = NEXT_STATUS[input.request.action]
  const requestedPublishAt =
    input.request.publishAt === undefined
      ? record.episode.publishAt
      : new Date(input.request.publishAt)
  const verdict = checkEpisodeTransition({
    current: record.episode.status,
    next,
    assetStatus: record.assetStatus,
    aiDisclosure: record.episode.aiDisclosure,
    publishAt: requestedPublishAt,
    publishedAt: record.episode.publishedAt,
    now: input.now,
    actor: transitionActor,
  })
  if (!verdict.ok) throw new AppError(verdict.code)
  const episode = await transitionEpisode(
    record.episode.id,
    next,
    verdict.patch,
  )
  if (next === 'PUBLISHED' && record.episode.publishedAt === null) {
    await enqueue(
      QUEUE.NOTIFY_FANOUT,
      { type: 'NEW_EPISODE', episodeId: episode.id },
      { jobId: `new-episode-${episode.id}`, attempts: 3 },
    )
  }
  return {
    id: episode.id,
    status: episode.status,
    publishAt: episode.publishAt?.toISOString() ?? null,
    publishedAt: episode.publishedAt?.toISOString() ?? null,
  }
}
