import { describe, expect, it } from 'vitest'

import {
  AccountPurgeJobSchema,
  EpisodeMediaDeleteJobSchema,
  JOB_SCHEMAS,
  NotificationFanoutJobSchema,
  PublishScheduledJobSchema,
} from './jobs.js'
import { QUEUE } from './queues.js'

describe('T08 queue contracts', () => {
  it('preserves an optional request ID across queue boundaries', () => {
    expect(
      JOB_SCHEMAS[QUEUE.VIDEO_TRANSCODE].parse({
        assetId: 'asset_1',
        requestId: 'req_123',
      }),
    ).toEqual({ assetId: 'asset_1', requestId: 'req_123' })
  })

  it('validates account purge by user ID', () => {
    expect(AccountPurgeJobSchema.parse({ userId: 'user_1' })).toEqual({
      userId: 'user_1',
    })
    expect(JOB_SCHEMAS[QUEUE.ACCOUNT_PURGE]).toBe(AccountPurgeJobSchema)
    expect(() => AccountPurgeJobSchema.parse({ userId: '' })).toThrow()
  })

  it('예약공개 스캔은 외부 상태를 payload로 받지 않는다', () => {
    expect(PublishScheduledJobSchema.parse({})).toEqual({})
    expect(JOB_SCHEMAS[QUEUE.EPISODE_PUBLISH]).toBe(PublishScheduledJobSchema)
  })

  it('미디어 삭제 payload는 assetId만 허용한다', () => {
    expect(EpisodeMediaDeleteJobSchema.parse({ assetId: 'asset_1' })).toEqual({
      assetId: 'asset_1',
    })
    expect(() => EpisodeMediaDeleteJobSchema.parse({ assetId: '' })).toThrow()
  })

  it('신작과 공개실패 알림 payload를 구분해 검증한다', () => {
    expect(
      NotificationFanoutJobSchema.parse({
        type: 'NEW_EPISODE',
        episodeId: 'episode_1',
      }),
    ).toEqual({ type: 'NEW_EPISODE', episodeId: 'episode_1' })
    expect(
      NotificationFanoutJobSchema.parse({
        type: 'PUBLISH_FAILED',
        episodeId: 'episode_1',
        errorCode: 'E_EPISODE_ASSET_NOT_READY',
      }),
    ).toMatchObject({ type: 'PUBLISH_FAILED' })
    expect(() =>
      NotificationFanoutJobSchema.parse({
        type: 'PUBLISH_FAILED',
        episodeId: 'episode_1',
        errorCode: 'UNKNOWN',
      }),
    ).toThrow()
  })
})
