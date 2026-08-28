import {
  LIMITS,
  type Episode,
  type Series,
  type VideoAsset,
} from '@aidream/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import {
  episodeFixture,
  seriesFixture,
} from '@/src/test-support/entity-fixtures'

const mocks = vi.hoisted(() => ({
  countSeriesByOwner: vi.fn(),
  findSeriesBySlug: vi.fn(),
  insertSeries: vi.fn(),
  findSeriesById: vi.fn(),
  countEpisodesBySeries: vi.fn(),
  findAssetOwnership: vi.fn(),
  createEpisodeWithTags: vi.fn(),
  findEpisodeForTransition: vi.fn(),
  transitionEpisode: vi.fn(),
  updateSeriesRow: vi.fn(),
  softDeleteSeriesCascade: vi.fn(),
  updateEpisodeWithTags: vi.fn(),
  listPublicSeries: vi.fn(),
  findPublicSeriesDetail: vi.fn(),
  listSeriesByOwner: vi.fn(),
  listEpisodesBySeries: vi.fn(),
  enqueue: vi.fn(),
  putObject: vi.fn(),
  deleteObject: vi.fn(),
}))

vi.mock('@aidream/db', () => ({
  countSeriesByOwner: mocks.countSeriesByOwner,
  findSeriesBySlug: mocks.findSeriesBySlug,
  createSeries: mocks.insertSeries,
  findSeriesById: mocks.findSeriesById,
  countEpisodesBySeries: mocks.countEpisodesBySeries,
  findAssetOwnership: mocks.findAssetOwnership,
  createEpisodeWithTags: mocks.createEpisodeWithTags,
  findEpisodeForTransition: mocks.findEpisodeForTransition,
  transitionEpisode: mocks.transitionEpisode,
  updateSeries: mocks.updateSeriesRow,
  softDeleteSeriesCascade: mocks.softDeleteSeriesCascade,
  updateEpisodeWithTags: mocks.updateEpisodeWithTags,
  listPublicSeries: mocks.listPublicSeries,
  findPublicSeriesDetail: mocks.findPublicSeriesDetail,
  listSeriesByOwner: mocks.listSeriesByOwner,
  listEpisodesBySeries: mocks.listEpisodesBySeries,
}))

vi.mock('@aidream/queue', async () => {
  const actual =
    await vi.importActual<typeof import('@aidream/queue')>('@aidream/queue')
  return { ...actual, enqueue: mocks.enqueue }
})

vi.mock('@aidream/storage/cdn', () => ({
  cdnUrl: (key: string) => `https://cdn.example/${key}`,
}))

vi.mock('@aidream/storage', () => ({
  BUCKET: { THUMBS: 'thumbs' },
  IMMUTABLE_1Y: 'public, max-age=31536000, immutable',
  cdnUrl: (key: string) => `https://cdn.example/${key}`,
  deleteObject: mocks.deleteObject,
  putObject: mocks.putObject,
  seriesPosterKey: (seriesId: string, version: string) =>
    `thumbs/posters/series/${seriesId}/${version}.webp`,
}))

const { createSeries } = await import('./create-series')
const { createEpisode } = await import('../episode/create-episode')
const { publishEpisode } = await import('../episode/publish-episode')
const { updateEpisode } = await import('../episode/update-episode')
const { deleteEpisode } = await import('../episode/delete-episode')
const { updateSeries } = await import('./update-series')
const { deleteSeries } = await import('./delete-series')
const { listSeries } = await import('./list-series')
const { getSeries } = await import('./get-series')
const { uploadSeriesPoster } = await import('./upload-series-poster')
const { listStudioSeries, getStudioSeries } = await import(
  './get-studio-series'
)

const SESSION: RouteSession = {
  userId: 'user_1',
  expiresAt: new Date('2026-08-26T00:00:00.000Z'),
  user: {
    id: 'user_1',
    handle: 'creator',
    email: 'creator@example.com',
    displayName: 'Creator',
    role: 'CREATOR',
    status: 'ACTIVE',
    emailVerified: true,
    tier: 'BRONZE',
    isVerified: false,
  },
}

const SERIES: Series = {
  ...seriesFixture(),
  id: 'series_1',
  ownerId: SESSION.userId,
  slug: '나의-드라마-2',
  title: '나의 드라마',
  synopsis: null,
  posterKey: 'thumbs/series_1/poster.jpg',
  ageRating: 'ALL',
  isCompleted: false,
  commentsOff: false,
  episodeCount: 0,
  totalViews: '0',
  createdAt: new Date('2026-08-25T00:00:00.000Z'),
  updatedAt: new Date('2026-08-25T00:00:00.000Z'),
  deletedAt: null,
}

const ASSET: VideoAsset = {
  id: 'asset_1',
  uploadId: 'upload_1',
  status: 'READY',
  originalKey: 'originals/user_1/episode.mp4',
  hlsPrefix: null,
  masterPath: null,
  posterKey: null,
  durationSec: null,
  width: null,
  height: null,
  videoCodec: null,
  audioCodec: null,
  bitrateKbps: null,
  sizeBytes: null,
  attemptCount: 0,
  errorCode: null,
  errorDetail: null,
  createdAt: SERIES.createdAt,
  updatedAt: SERIES.updatedAt,
  readyAt: null,
}

const EPISODE: Episode = {
  ...episodeFixture(),
  id: 'episode_1',
  seriesId: SERIES.id,
  seasonId: 'season_1',
  assetId: ASSET.id,
  number: 1,
  title: '첫 화',
  description: null,
  thumbKey: null,
  status: 'DRAFT',
  ageRating: 'ALL',
  aiDisclosure: 'AIDREAM',
  publishAt: null,
  publishedAt: null,
  viewCount: '0',
  likeCount: 0,
  commentCount: 0,
  rankScore: 0,
  createdAt: SERIES.createdAt,
  updatedAt: SERIES.updatedAt,
  deletedAt: null,
}

beforeEach(() => {
  mocks.countSeriesByOwner.mockReset().mockResolvedValue(0)
  mocks.findSeriesBySlug
    .mockReset()
    .mockResolvedValueOnce(SERIES)
    .mockResolvedValue(null)
  mocks.insertSeries.mockReset().mockResolvedValue(SERIES)
  mocks.findSeriesById.mockReset().mockResolvedValue(SERIES)
  mocks.countEpisodesBySeries.mockReset().mockResolvedValue(0)
  mocks.findAssetOwnership.mockReset().mockResolvedValue({
    asset: ASSET,
    ownerId: SESSION.userId,
    episodeId: null,
  })
  mocks.createEpisodeWithTags.mockReset().mockResolvedValue(EPISODE)
  mocks.findEpisodeForTransition.mockReset().mockResolvedValue({
    episode: EPISODE,
    ownerId: SESSION.userId,
    assetStatus: 'READY',
  })
  mocks.transitionEpisode
    .mockReset()
    .mockImplementation(
      (
        _id: string,
        status: Episode['status'],
        patch: { publishAt: Date | null; publishedAt: Date | null },
      ) => Promise.resolve({ ...EPISODE, status, ...patch }),
    )
  mocks.updateSeriesRow.mockReset().mockResolvedValue(SERIES)
  mocks.softDeleteSeriesCascade.mockReset().mockResolvedValue({
    series: SERIES,
    assetIds: [ASSET.id],
  })
  mocks.updateEpisodeWithTags.mockReset().mockResolvedValue(EPISODE)
  mocks.listPublicSeries.mockReset().mockResolvedValue({
    items: [SERIES],
    nextCursor: null,
  })
  mocks.findPublicSeriesDetail.mockReset().mockResolvedValue({
    series: SERIES,
    episodes: [EPISODE],
  })
  mocks.listSeriesByOwner.mockReset().mockResolvedValue({
    items: [SERIES],
    nextCursor: null,
  })
  mocks.listEpisodesBySeries.mockReset().mockResolvedValue({
    items: [EPISODE],
    nextCursor: null,
  })
  mocks.enqueue.mockReset().mockResolvedValue(undefined)
  mocks.putObject.mockReset().mockResolvedValue({ etag: 'etag' })
  mocks.deleteObject.mockReset().mockResolvedValue(undefined)
})

describe('createEpisode', () => {
  const input = {
    seriesId: SERIES.id,
    number: 1,
    title: '첫 화',
    assetId: ASSET.id,
    ageRating: 'ALL' as const,
    aiDisclosure: 'AIDREAM',
    tags: ['AI Drama', 'ai   drama'],
  }

  it('기본 시즌과 중복 제거된 정규화 태그로 DRAFT를 만든다', async () => {
    await expect(createEpisode(SESSION, input)).resolves.toMatchObject({
      id: EPISODE.id,
      status: 'DRAFT',
    })
    expect(mocks.createEpisodeWithTags).toHaveBeenCalledWith(
      expect.objectContaining({ seasonNumber: 1, tags: ['ai-drama'] }),
    )
  })

  it('남의 시리즈와 남의 자산을 거부한다', async () => {
    mocks.findSeriesById.mockResolvedValueOnce({ ...SERIES, ownerId: 'other' })
    await expect(createEpisode(SESSION, input)).rejects.toMatchObject({
      code: 'E_PERM_NOT_OWNER',
    })
    mocks.findAssetOwnership.mockResolvedValueOnce({
      asset: ASSET,
      ownerId: 'other',
      episodeId: null,
    })
    await expect(createEpisode(SESSION, input)).rejects.toMatchObject({
      code: 'E_ASSET_NOT_FOUND',
    })
  })

  it('이미 연결된 자산을 E_DB_CONFLICT로 거부한다', async () => {
    mocks.findAssetOwnership.mockResolvedValueOnce({
      asset: ASSET,
      ownerId: SESSION.userId,
      episodeId: 'other_episode',
    })
    await expect(createEpisode(SESSION, input)).rejects.toMatchObject({
      code: 'E_DB_CONFLICT',
    })
  })
})

describe('publishEpisode', () => {
  const serviceInput = {
    episodeId: EPISODE.id,
    session: SESSION,
    request: { action: 'PUBLISH' as const },
    now: new Date('2026-08-25T01:00:00.000Z'),
  }

  it('최초 공개를 상태기계로 반영하고 신작 알림을 한 번 발행한다', async () => {
    await expect(publishEpisode(serviceInput)).resolves.toMatchObject({
      id: EPISODE.id,
      status: 'PUBLISHED',
      publishedAt: serviceInput.now.toISOString(),
    })
    expect(mocks.transitionEpisode).toHaveBeenCalledWith(
      EPISODE.id,
      'PUBLISHED',
      { publishAt: null, publishedAt: serviceInput.now },
    )
    expect(mocks.enqueue).toHaveBeenCalledWith(
      'notification.fanout',
      { type: 'NEW_EPISODE', episodeId: EPISODE.id },
      expect.objectContaining({ jobId: `new-episode-${EPISODE.id}` }),
    )
  })

  it('신작 알림 큐가 실패해도 이미 확정된 공개 상태는 성공으로 응답한다', async () => {
    mocks.enqueue.mockRejectedValueOnce(new Error('queue unavailable'))
    await expect(publishEpisode(serviceInput)).resolves.toMatchObject({
      id: EPISODE.id,
      status: 'PUBLISHED',
    })
    expect(mocks.transitionEpisode).toHaveBeenCalledOnce()
  })

  it('자산 미준비와 AI 표기 누락을 정확한 코드로 거부한다', async () => {
    mocks.findEpisodeForTransition.mockResolvedValueOnce({
      episode: EPISODE,
      ownerId: SESSION.userId,
      assetStatus: 'TRANSCODING',
    })
    await expect(publishEpisode(serviceInput)).rejects.toMatchObject({
      code: 'E_EPISODE_ASSET_NOT_READY',
    })
    mocks.findEpisodeForTransition.mockResolvedValueOnce({
      episode: { ...EPISODE, aiDisclosure: null },
      ownerId: SESSION.userId,
      assetStatus: 'READY',
    })
    await expect(publishEpisode(serviceInput)).rejects.toMatchObject({
      code: 'E_EPISODE_AI_DISCLOSURE_REQUIRED',
    })
  })

  it('소유자가 아니면 상태를 바꾸지 않는다', async () => {
    mocks.findEpisodeForTransition.mockResolvedValueOnce({
      episode: EPISODE,
      ownerId: 'other',
      assetStatus: 'READY',
    })
    await expect(publishEpisode(serviceInput)).rejects.toMatchObject({
      code: 'E_PERM_NOT_OWNER',
    })
    expect(mocks.transitionEpisode).not.toHaveBeenCalled()
  })

  it('UNHIDE는 기존 publishedAt을 보존하고 알림을 다시 만들지 않는다', async () => {
    const publishedAt = new Date('2026-08-24T00:00:00.000Z')
    mocks.findEpisodeForTransition.mockResolvedValueOnce({
      episode: { ...EPISODE, status: 'HIDDEN', publishedAt },
      ownerId: SESSION.userId,
      assetStatus: 'READY',
    })
    await publishEpisode({
      ...serviceInput,
      request: { action: 'UNHIDE' },
    })
    expect(mocks.transitionEpisode).toHaveBeenCalledWith(
      EPISODE.id,
      'PUBLISHED',
      { publishAt: null, publishedAt },
    )
    expect(mocks.enqueue).not.toHaveBeenCalled()
  })
})

describe('createSeries', () => {
  it('권한·한도·고유 슬러그 순서로 시리즈를 만든다', async () => {
    await expect(
      createSeries(SESSION, { title: '나의 드라마' }),
    ).resolves.toMatchObject({
      id: SERIES.id,
      slug: '나의-드라마-2',
      posterUrl: 'https://cdn.example/thumbs/series_1/poster.jpg',
    })
    expect(mocks.insertSeries).toHaveBeenCalledWith(
      expect.objectContaining({ slug: '나의-드라마-2' }),
    )
  })

  it('VIEWER를 E_PERM_DENIED로 거부한다', async () => {
    await expect(
      createSeries(
        { ...SESSION, user: { ...SESSION.user, role: 'VIEWER' } },
        { title: '금지' },
      ),
    ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
    expect(mocks.countSeriesByOwner).not.toHaveBeenCalled()
  })

  it('계정당 시리즈 한도를 넘기지 않는다', async () => {
    mocks.countSeriesByOwner.mockResolvedValue(LIMITS.SERIES_PER_USER)
    await expect(
      createSeries(SESSION, { title: '한도 초과' }),
    ).rejects.toMatchObject({ code: 'E_SERIES_LIMIT_EXCEEDED' })
    expect(mocks.insertSeries).not.toHaveBeenCalled()
  })
})

describe('series and episode management', () => {
  it('lists public and owner series through their repository boundaries', async () => {
    await expect(listSeries({ limit: 20 })).resolves.toMatchObject({
      items: [{ id: SERIES.id }],
      nextCursor: null,
    })
    await expect(getSeries(SERIES.id)).resolves.toMatchObject({
      series: { id: SERIES.id },
      episodes: [{ id: EPISODE.id }],
    })
    await expect(listStudioSeries(SESSION)).resolves.toHaveLength(1)
    await expect(getStudioSeries(SESSION, SERIES.id)).resolves.toMatchObject({
      series: { id: SERIES.id },
      episodes: [{ id: EPISODE.id }],
    })
  })

  it('returns precise not-found errors for missing public and studio series', async () => {
    mocks.findPublicSeriesDetail.mockResolvedValueOnce(null)
    await expect(getSeries('missing')).rejects.toMatchObject({
      code: 'E_SERIES_NOT_FOUND',
    })
    mocks.findSeriesById.mockResolvedValueOnce(null)
    await expect(getStudioSeries(SESSION, 'missing')).rejects.toMatchObject({
      code: 'E_SERIES_NOT_FOUND',
    })
  })

  it('updates owned series and episodes while normalizing tags', async () => {
    await updateSeries(SERIES.id, SESSION, {
      synopsis: null,
      isCompleted: true,
    })
    expect(mocks.updateSeriesRow).toHaveBeenCalledWith(
      SERIES.id,
      expect.objectContaining({ synopsis: null, isCompleted: true }),
    )
    await updateEpisode(EPISODE.id, SESSION, {
      title: '수정된 첫 화',
      tags: ['AI Drama', 'ai drama'],
    })
    expect(mocks.updateEpisodeWithTags).toHaveBeenCalledWith(
      EPISODE.id,
      { title: '수정된 첫 화' },
      ['ai-drama'],
      undefined,
    )

    await updateEpisode(EPISODE.id, SESSION, {
      seasonNumber: 2,
      number: 3,
    })
    expect(mocks.updateEpisodeWithTags).toHaveBeenLastCalledWith(
      EPISODE.id,
      {},
      undefined,
      { seasonNumber: 2, number: 3 },
    )
  })

  it('stores a versioned work thumbnail and removes the replaced object', async () => {
    const result = await uploadSeriesPoster(
      SERIES.id,
      SESSION,
      `data:image/webp;base64,${Buffer.from('RIFF0000WEBP').toString('base64')}`,
    )
    expect(mocks.putObject).toHaveBeenCalledWith(
      expect.objectContaining({
        bucket: 'thumbs',
        contentType: 'image/webp',
      }),
    )
    expect(mocks.updateSeriesRow).toHaveBeenCalledOnce()
    expect(mocks.deleteObject).toHaveBeenCalledWith('thumbs', SERIES.posterKey)
    expect(result.posterUrl).toMatch(/^https:\/\/cdn\.example\//u)
  })

  it('rejects foreign management and reused replacement assets', async () => {
    mocks.findSeriesById.mockResolvedValueOnce({ ...SERIES, ownerId: 'other' })
    await expect(
      updateSeries(SERIES.id, SESSION, { title: '금지' }),
    ).rejects.toMatchObject({
      code: 'E_PERM_NOT_OWNER',
    })
    mocks.findAssetOwnership.mockResolvedValueOnce({
      asset: ASSET,
      ownerId: SESSION.userId,
      episodeId: 'other_episode',
    })
    await expect(
      updateEpisode(EPISODE.id, SESSION, { assetId: ASSET.id }),
    ).rejects.toMatchObject({ code: 'E_DB_CONFLICT' })
  })

  it('deletes through the state machine and emits idempotent media jobs', async () => {
    await deleteEpisode(
      EPISODE.id,
      SESSION,
      new Date('2026-08-25T02:00:00.000Z'),
    )
    expect(mocks.transitionEpisode).toHaveBeenCalledWith(
      EPISODE.id,
      'REMOVED',
      expect.any(Object),
    )
    await deleteSeries(SERIES.id, SESSION)
    expect(mocks.enqueue).toHaveBeenCalledWith(
      'episode.mediaDelete',
      { assetId: ASSET.id },
      expect.objectContaining({ jobId: `episode-media-delete-${ASSET.id}` }),
    )
  })
})
