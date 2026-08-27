import type { Episode } from '@aidream/core'
import { episodeFixture } from '@aidream/core/test-support'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  deletePrefix: vi.fn(),
  enqueue: vi.fn(),
  error: vi.fn(),
  scan: vi.fn(),
  transition: vi.fn(),
}))

vi.mock('@aidream/db', () => ({
  listScheduledEpisodesDue: mocks.scan,
  transitionEpisode: mocks.transition,
}))

vi.mock('@aidream/queue', async () => {
  const actual =
    await vi.importActual<typeof import('@aidream/queue')>('@aidream/queue')
  return { ...actual, enqueue: mocks.enqueue }
})

vi.mock('@aidream/storage', async () => {
  const actual =
    await vi.importActual<typeof import('@aidream/storage')>('@aidream/storage')
  return { ...actual, deletePrefix: mocks.deletePrefix }
})

vi.mock('pino', () => ({
  default: () => ({ error: mocks.error }),
}))

const { deleteEpisodeMedia } = await import('./delete-episode-media.js')
const { publishScheduled } = await import('./publish-scheduled.js')

const NOW = new Date('2026-08-25T00:00:00.000Z')
const ASSET_ID = 'asset_1'
const EPISODE: Episode = {
  ...episodeFixture(),
  id: 'episode_production',
  seriesId: 'series_1',
  seasonId: 'season_1',
  assetId: ASSET_ID,
  number: 1,
  title: '예약 공개',
  description: null,
  thumbKey: null,
  status: 'SCHEDULED',
  ageRating: 'ALL',
  aiDisclosure: 'AI 배경 사용',
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

beforeEach(() => {
  mocks.deletePrefix.mockReset().mockResolvedValue(undefined)
  mocks.enqueue.mockReset().mockResolvedValue(undefined)
  mocks.error.mockReset()
  mocks.scan.mockReset()
  mocks.transition
    .mockReset()
    .mockImplementation(
      (
        id: string,
        status: Episode['status'],
        patch: { publishAt: Date | null; publishedAt: Date | null },
      ) => Promise.resolve({ ...EPISODE, id, status, ...patch }),
    )
})

describe('production episode job dependencies', () => {
  it('removes the canonical HLS prefix through storage', async () => {
    await deleteEpisodeMedia({ assetId: ASSET_ID })
    expect(mocks.deletePrefix).toHaveBeenCalledWith('hls', `hls/${ASSET_ID}/`)
  })

  it('publishes, notifies, and immediately continues a full batch', async () => {
    mocks.scan.mockResolvedValue([
      { episode: EPISODE, ownerId: 'owner_1', assetStatus: 'READY' },
    ])
    await expect(
      publishScheduled({ now: NOW, limit: 1 }),
    ).resolves.toMatchObject({ published: 1, hasMore: true })
    expect(mocks.enqueue).toHaveBeenCalledWith(
      'notification.fanout',
      { type: 'NEW_EPISODE', episodeId: EPISODE.id },
      expect.objectContaining({ jobId: `new-episode-${EPISODE.id}` }),
    )
    expect(mocks.enqueue).toHaveBeenCalledWith('episode.publishScheduled', {})
  })

  it('notifies a validation rollback and logs an isolated DB failure', async () => {
    mocks.scan.mockResolvedValueOnce([
      { episode: EPISODE, ownerId: 'owner_1', assetStatus: 'FAILED' },
    ])
    await publishScheduled({ now: NOW })
    expect(mocks.enqueue).toHaveBeenCalledWith(
      'notification.fanout',
      {
        type: 'PUBLISH_FAILED',
        episodeId: EPISODE.id,
        errorCode: 'E_EPISODE_ASSET_NOT_READY',
      },
      expect.objectContaining({ jobId: `publish-failed-${EPISODE.id}` }),
    )

    mocks.scan.mockResolvedValueOnce([
      { episode: EPISODE, ownerId: 'owner_1', assetStatus: 'READY' },
    ])
    const failure = new Error('database unavailable')
    mocks.transition.mockRejectedValueOnce(failure)
    await expect(publishScheduled({ now: NOW })).resolves.toMatchObject({
      failed: 1,
    })
    expect(mocks.error).toHaveBeenCalledWith(
      { err: failure, episodeId: EPISODE.id },
      'scheduled publish failed',
    )
  })
})
