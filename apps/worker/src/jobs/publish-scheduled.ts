import { checkEpisodeTransition, type ErrorCode } from '@aidream/core'
import {
  listScheduledEpisodesDue,
  transitionEpisode,
  type EpisodeTransitionRecord,
} from '@aidream/db'
import { enqueue, QUEUE } from '@aidream/queue'
import pino from 'pino'

export interface PublishScheduledInput {
  readonly now: Date
  readonly limit?: number
}

export interface PublishScheduledResult {
  readonly examined: number
  readonly published: number
  readonly revertedToDraft: number
  readonly failed: number
  readonly hasMore: boolean
}

export interface PublishScheduledDependencies {
  readonly scan: (
    now: Date,
    limit: number,
  ) => Promise<readonly EpisodeTransitionRecord[]>
  readonly transition: typeof transitionEpisode
  readonly notifyPublished: (episodeId: string) => Promise<void>
  readonly notifyFailed: (
    episodeId: string,
    errorCode: ErrorCode,
  ) => Promise<void>
  readonly continueImmediately: () => Promise<void>
  readonly logFailure: (episodeId: string, error: unknown) => void
}

export function publishScheduled(
  input: PublishScheduledInput,
  dependencies: PublishScheduledDependencies = PRODUCTION_DEPENDENCIES,
): Promise<PublishScheduledResult> {
  return runPublishScheduled(input, dependencies)
}

async function runPublishScheduled(
  input: PublishScheduledInput,
  dependencies: PublishScheduledDependencies,
): Promise<PublishScheduledResult> {
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 100)
  const records = await dependencies.scan(input.now, limit)
  let published = 0
  let revertedToDraft = 0
  let failed = 0

  for (const record of records) {
    try {
      const verdict = checkEpisodeTransition({
        current: record.episode.status,
        next: 'PUBLISHED',
        assetStatus: record.assetStatus,
        aiDisclosure: record.episode.aiDisclosure,
        publishAt: record.episode.publishAt,
        publishedAt: record.episode.publishedAt,
        now: input.now,
        actor: { kind: 'SCHEDULER' },
      })
      if (verdict.ok) {
        const episode = await dependencies.transition(
          record.episode.id,
          'PUBLISHED',
          verdict.patch,
        )
        if (record.episode.publishedAt === null) {
          await dependencies.notifyPublished(episode.id)
        }
        published += 1
        continue
      }

      const rollback = checkEpisodeTransition({
        current: record.episode.status,
        next: 'DRAFT',
        assetStatus: record.assetStatus,
        aiDisclosure: record.episode.aiDisclosure,
        publishAt: record.episode.publishAt,
        publishedAt: record.episode.publishedAt,
        now: input.now,
        actor: { kind: 'SCHEDULER' },
      })
      if (!rollback.ok) {
        throw new Error(`scheduler rollback rejected: ${rollback.code}`)
      }
      const episode = await dependencies.transition(
        record.episode.id,
        'DRAFT',
        rollback.patch,
      )
      await dependencies.notifyFailed(episode.id, verdict.code)
      revertedToDraft += 1
    } catch (error: unknown) {
      failed += 1
      dependencies.logFailure(record.episode.id, error)
    }
  }

  const hasMore = records.length === limit
  if (hasMore) await dependencies.continueImmediately()
  return {
    examined: records.length,
    published,
    revertedToDraft,
    failed,
    hasMore,
  }
}

const logger = pino()

const PRODUCTION_DEPENDENCIES: PublishScheduledDependencies = {
  scan: listScheduledEpisodesDue,
  transition: transitionEpisode,
  notifyPublished: (episodeId) =>
    enqueue(
      QUEUE.NOTIFY_FANOUT,
      { type: 'NEW_EPISODE', episodeId },
      { jobId: `new-episode-${episodeId}`, attempts: 3 },
    ),
  notifyFailed: (episodeId, errorCode) =>
    enqueue(
      QUEUE.NOTIFY_FANOUT,
      { type: 'PUBLISH_FAILED', episodeId, errorCode },
      { jobId: `publish-failed-${episodeId}`, attempts: 3 },
    ),
  continueImmediately: () => enqueue(QUEUE.EPISODE_PUBLISH, {}),
  logFailure: (episodeId, error) => {
    logger.error({ err: error, episodeId }, 'scheduled publish failed')
  },
}
