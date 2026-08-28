/**
 * 큐 이름. **문자열을 코드에 박지 않는다** — 발행하는 쪽과 소비하는 쪽이
 * 한 글자만 달라도 잡이 조용히 사라지고, 그 실패는 아무 로그도 남기지 않는다.
 *
 * 목록의 출처는 `T05_UPLOAD.md` §4 이며 T06(워커)이 같은 상수를 소비한다.
 */
export const QUEUE = {
  VIDEO_TRANSCODE: 'video.transcode',
  VIDEO_THUMBNAIL: 'video.thumbnail',
  EPISODE_PUBLISH: 'episode.publishScheduled',
  EPISODE_MEDIA_DELETE: 'episode.mediaDelete',
  FEED_RANK: 'feed.rankRecompute',
  COUNTER_FLUSH: 'counter.flush',
  COUNTER_RECONCILE: 'counter.reconcile',
  NOTIFY_FANOUT: 'notification.fanout',
  STORAGE_CLEANUP: 'storage.cleanup',
  DB_PURGE: 'db.purge',
  ACCOUNT_PURGE: 'account.purge',
  RECOVER_STUCK: 'asset.recoverStuck',
} as const

export type QueueName = (typeof QUEUE)[keyof typeof QUEUE]

export const QUEUE_NAMES: readonly QueueName[] = Object.values(QUEUE)
