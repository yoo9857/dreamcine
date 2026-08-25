import type { Episode, VideoAsset } from '@aidream/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { deleteEpisodeMedia } from './delete-episode-media.js'
import {
  publishScheduled,
  type PublishScheduledDependencies,
} from './publish-scheduled.js'

const NOW = new Date('2026-08-25T00:00:00.000Z')
const EPISODE: Episode = {
  id: 'episode_1',
  seriesId: 'series_1',
  seasonId: 'season_1',
  assetId: 'asset_1',
  number: 1,
  title: '예약 화',
  description: null,
  thumbKey: null,
  status: 'SCHEDULED',
  ageRating: 'ALL',
  aiDisclosure: 'AIDREAM',
  publishAt: NOW,
  publishedAt: null,
  viewCount: '0',
  likeCount: 0,
  commentCount: 0,
  rankScore: 0,
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
}

function dependencies(): PublishScheduledDependencies {
  return {
    scan: vi.fn().mockResolvedValue([]),
    transition: vi
      .fn()
      .mockImplementation(
        (
          id: string,
          status: Episode['status'],
          patch: { publishAt: Date | null; publishedAt: Date | null },
        ) => Promise.resolve({ ...EPISODE, id, status, ...patch }),
      ),
    notifyPublished: vi.fn().mockResolvedValue(undefined),
    notifyFailed: vi.fn().mockResolvedValue(undefined),
    continueImmediately: vi.fn().mockResolvedValue(undefined),
    logFailure: vi.fn(),
  }
}

describe('deleteEpisodeMedia', () => {
  it('삭제 대상 assetId의 HLS prefix를 한 번 지운다', async () => {
    const removePrefix = vi.fn().mockResolvedValue(undefined)
    await expect(
      deleteEpisodeMedia({ assetId: 'asset_1' }, { removePrefix }),
    ).resolves.toBeUndefined()
    expect(removePrefix).toHaveBeenCalledOnce()
    expect(removePrefix).toHaveBeenCalledWith('asset_1')
  })

  it('저장소 실패를 삼키지 않아 BullMQ 재시도를 활성화한다', async () => {
    const error = new Error('storage unavailable')
    await expect(
      deleteEpisodeMedia(
        { assetId: 'asset_1' },
        { removePrefix: vi.fn().mockRejectedValue(error) },
      ),
    ).rejects.toBe(error)
  })
})

describe('publishScheduled', () => {
  let deps: PublishScheduledDependencies

  beforeEach(() => {
    deps = dependencies()
  })

  it('도래한 READY 에피소드를 공개하고 신작 알림을 발행한다', async () => {
    vi.mocked(deps.scan).mockResolvedValue([
      { episode: EPISODE, ownerId: 'owner_1', assetStatus: 'READY' },
    ])
    await expect(publishScheduled({ now: NOW }, deps)).resolves.toMatchObject({
      published: 1,
      revertedToDraft: 0,
      failed: 0,
    })
    expect(deps.transition).toHaveBeenCalledWith(EPISODE.id, 'PUBLISHED', {
      publishAt: null,
      publishedAt: NOW,
    })
    expect(deps.notifyPublished).toHaveBeenCalledWith(EPISODE.id)
  })

  it('공개 조건 실패는 상태기계로 DRAFT 복귀하고 이유를 알린다', async () => {
    vi.mocked(deps.scan).mockResolvedValue([
      { episode: EPISODE, ownerId: 'owner_1', assetStatus: 'FAILED' },
    ])
    await expect(publishScheduled({ now: NOW }, deps)).resolves.toMatchObject({
      published: 0,
      revertedToDraft: 1,
      failed: 0,
    })
    expect(deps.transition).toHaveBeenCalledWith(EPISODE.id, 'DRAFT', {
      publishAt: null,
      publishedAt: null,
    })
    expect(deps.notifyFailed).toHaveBeenCalledWith(
      EPISODE.id,
      'E_EPISODE_ASSET_NOT_READY',
    )
  })

  it('개별 실패를 격리하고 꽉 찬 배치는 즉시 이어서 실행한다', async () => {
    vi.mocked(deps.scan).mockResolvedValue([
      { episode: EPISODE, ownerId: 'owner_1', assetStatus: 'READY' },
    ])
    vi.mocked(deps.transition).mockRejectedValueOnce(
      new Error('db unavailable'),
    )
    await expect(
      publishScheduled({ now: NOW, limit: 1 }, deps),
    ).resolves.toEqual({
      examined: 1,
      published: 0,
      revertedToDraft: 0,
      failed: 1,
      hasMore: true,
    })
    expect(deps.logFailure).toHaveBeenCalledOnce()
    expect(deps.continueImmediately).toHaveBeenCalledOnce()
  })

  it('두 번째 스캔이 비어 있으면 알림을 중복 발행하지 않는다', async () => {
    vi.mocked(deps.scan)
      .mockResolvedValueOnce([
        { episode: EPISODE, ownerId: 'owner_1', assetStatus: 'READY' },
      ])
      .mockResolvedValueOnce([])
    await publishScheduled({ now: NOW }, deps)
    await publishScheduled({ now: NOW }, deps)
    expect(deps.notifyPublished).toHaveBeenCalledOnce()
  })

  it('타입 픽스처가 실제 자산 enum과 일치한다', () => {
    const status: VideoAsset['status'] = 'READY'
    expect(status).toBe('READY')
  })
})
