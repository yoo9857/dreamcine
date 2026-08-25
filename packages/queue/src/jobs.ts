import { z } from 'zod'
import { ERROR_CODES } from '@aidream/core'

import { QUEUE, type QueueName } from './queues.js'

const TRACE_FIELDS = {
  requestId: z.string().min(1).optional(),
} as const

/**
 * 잡 페이로드의 계약.
 *
 * **id 만 싣는다.** 잡이 만들어진 시점의 데이터를 통째로 실으면, 워커가
 * 그것을 집어들 때쯤 이미 낡아 있다 — 그 사이 에피소드가 비공개로 바뀌거나
 * 자산이 지워졌을 수 있다. 워커는 id 로 현재 상태를 다시 읽어야 한다.
 *
 * 페이로드가 작아야 하는 실무적 이유도 있다. Redis 에 남는 잡 데이터가
 * 커지면 큐 자체가 메모리를 먹는다.
 */

export const TranscodeJobSchema = z.object({
  ...TRACE_FIELDS,
  assetId: z.string().min(1),
})

export const ThumbnailJobSchema = z.object({
  ...TRACE_FIELDS,
  assetId: z.string().min(1),
})

export const StorageCleanupJobSchema = z.object({
  ...TRACE_FIELDS,
  /** 무엇을 정리하는 회차인지. 잡 로그에서 구분하기 위한 것. */
  scope: z.enum(['staleUploads', 'orphanAssets', 'failedOriginals']),
})

export const RecoverStuckJobSchema = z.object({
  ...TRACE_FIELDS,
  /** 이 시간(분) 이상 PENDING 인 자산을 다시 발행한다. */
  olderThanMinutes: z.number().int().positive(),
})

export const DbPurgeJobSchema = z.object({
  ...TRACE_FIELDS,
  dryRun: z.boolean(),
})

export const PublishScheduledJobSchema = z.object({ ...TRACE_FIELDS })

export const EpisodeMediaDeleteJobSchema = z.object({
  ...TRACE_FIELDS,
  assetId: z.string().min(1),
})

export const RankRecomputeJobSchema = z.object({
  ...TRACE_FIELDS,
  scope: z.enum(['recent', 'expired']),
})

export const NotificationFanoutJobSchema = z.discriminatedUnion('type', [
  z.object({
    ...TRACE_FIELDS,
    type: z.literal('NEW_EPISODE'),
    episodeId: z.string().min(1),
    cursor: z.string().min(1).optional(),
  }),
  z.object({
    ...TRACE_FIELDS,
    type: z.literal('PUBLISH_FAILED'),
    episodeId: z.string().min(1),
    errorCode: z.enum(ERROR_CODES),
  }),
])

export const CounterFlushJobSchema = z.object({ ...TRACE_FIELDS })
export const CounterReconcileJobSchema = z.object({
  ...TRACE_FIELDS,
  changedSinceDays: z.number().int().positive().default(7),
})

/**
 * 큐 이름 → 페이로드 스키마. 이 표가 발행 함수의 타입 안전성을 만든다.
 *
 * 아직 정의되지 않은 큐는 여기에 없다 — 소유 태스크가 채운다. 빈 스키마로
 * 미리 채워 두면 "정의됐다" 는 착각이 남는다.
 */
export const JOB_SCHEMAS = {
  [QUEUE.VIDEO_TRANSCODE]: TranscodeJobSchema,
  [QUEUE.VIDEO_THUMBNAIL]: ThumbnailJobSchema,
  [QUEUE.STORAGE_CLEANUP]: StorageCleanupJobSchema,
  [QUEUE.RECOVER_STUCK]: RecoverStuckJobSchema,
  [QUEUE.DB_PURGE]: DbPurgeJobSchema,
  [QUEUE.EPISODE_PUBLISH]: PublishScheduledJobSchema,
  [QUEUE.EPISODE_MEDIA_DELETE]: EpisodeMediaDeleteJobSchema,
  [QUEUE.FEED_RANK]: RankRecomputeJobSchema,
  [QUEUE.NOTIFY_FANOUT]: NotificationFanoutJobSchema,
  [QUEUE.COUNTER_FLUSH]: CounterFlushJobSchema,
  [QUEUE.COUNTER_RECONCILE]: CounterReconcileJobSchema,
} as const

export type DefinedQueue = keyof typeof JOB_SCHEMAS

export type JobPayload<Q extends DefinedQueue> = z.infer<
  (typeof JOB_SCHEMAS)[Q]
>

/** 아직 페이로드가 정의되지 않은 큐. T08~T12 가 채운다. */
export type UndefinedQueue = Exclude<QueueName, DefinedQueue>
