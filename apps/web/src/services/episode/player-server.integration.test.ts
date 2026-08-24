import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'

const mocks = vi.hoisted(() => ({
  findEpisode: vi.fn(),
  findProgress: vi.fn(),
  hasBlock: vi.fn(),
  upsertProgress: vi.fn(),
  setIfAbsent: vi.fn(),
  incr: vi.fn(),
}))

vi.mock('@aidream/db', () => ({
  findPlaybackEpisode: mocks.findEpisode,
  findWatchProgress: mocks.findProgress,
  hasBlockBetween: mocks.hasBlock,
  upsertWatchProgress: mocks.upsertProgress,
}))
vi.mock('@/src/lib/redis', () => ({
  getRedis: () => ({
    setIfAbsent: mocks.setIfAbsent,
    incr: mocks.incr,
  }),
}))

const { createAgeVerificationCookie } = await import(
  '@/src/lib/age-verification'
)
const { confirmAge } = await import('./confirm-age.js')
const { countView, hashIp } = await import('./count-view.js')
const { getPlayback } = await import('./get-playback.js')
const { saveProgress } = await import('./save-progress.js')

const NOW = new Date('2026-08-24T12:00:00.000Z')
const AUTH_SECRET = 'test-auth-secret-at-least-thirty-two-characters'
const SESSION: RouteSession = {
  userId: 'viewer_1',
  user: {
    id: 'viewer_1',
    handle: 'viewer',
    email: 'viewer@example.com',
    displayName: 'Viewer',
    role: 'VIEWER',
    status: 'ACTIVE',
    emailVerified: true,
  },
  expiresAt: new Date('2026-08-25T12:00:00.000Z'),
}
const EPISODE = {
  id: 'episode_1',
  ownerId: 'creator_1',
  status: 'PUBLISHED' as const,
  ageRating: 'ALL' as const,
  asset: {
    id: 'asset_1',
    status: 'READY' as const,
    durationSec: 120,
    posterKey: 'thumbs/asset_1/poster.jpg',
    renditions: [{ name: '720p', width: 1280, height: 720 }],
  },
}

beforeEach(() => {
  process.env.AUTH_SECRET = AUTH_SECRET
  process.env.CDN_BASE_URL = 'https://cdn.example.com'
  process.env.NEXT_PUBLIC_CDN_BASE_URL = 'https://cdn.example.com'
  mocks.findEpisode.mockReset().mockResolvedValue(EPISODE)
  mocks.findProgress.mockReset().mockResolvedValue(null)
  mocks.hasBlock.mockReset().mockResolvedValue(false)
  mocks.upsertProgress.mockReset().mockResolvedValue(undefined)
  mocks.setIfAbsent.mockReset().mockResolvedValue(true)
  mocks.incr.mockReset().mockResolvedValue(1)
})

describe('getPlayback', () => {
  it('returns CDN URLs and resumes progress only when enough video remains', async () => {
    mocks.findProgress.mockResolvedValue({
      userId: SESSION.userId,
      episodeId: EPISODE.id,
      positionSec: 45,
      completed: false,
      updatedAt: NOW,
    })
    await expect(
      getPlayback({
        episodeId: EPISODE.id,
        session: SESSION,
        cookieHeader: null,
        now: NOW,
      }),
    ).resolves.toEqual({
      episodeId: EPISODE.id,
      masterUrl: 'https://cdn.example.com/hls/asset_1/master.m3u8',
      posterUrl: 'https://cdn.example.com/thumbs/asset_1/poster.jpg',
      durationSec: 120,
      startAtSec: 45,
      renditions: EPISODE.asset.renditions,
    })

    mocks.findProgress.mockResolvedValue({
      userId: SESSION.userId,
      episodeId: EPISODE.id,
      positionSec: 100,
      completed: false,
      updatedAt: NOW,
    })
    await expect(
      getPlayback({
        episodeId: EPISODE.id,
        session: SESSION,
        cookieHeader: null,
        now: NOW,
      }),
    ).resolves.toMatchObject({ startAtSec: 0 })
  })

  it('rejects missing, hidden, blocked, restricted, and unready playback', async () => {
    mocks.findEpisode.mockResolvedValueOnce(null)
    await expect(
      getPlayback({
        episodeId: 'missing',
        session: null,
        cookieHeader: null,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: 'E_EPISODE_NOT_FOUND' })

    mocks.findEpisode.mockResolvedValueOnce({ ...EPISODE, status: 'DRAFT' })
    await expect(
      getPlayback({
        episodeId: EPISODE.id,
        session: SESSION,
        cookieHeader: null,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: 'E_EPISODE_NOT_PUBLISHED' })

    mocks.hasBlock.mockResolvedValueOnce(true)
    await expect(
      getPlayback({
        episodeId: EPISODE.id,
        session: SESSION,
        cookieHeader: null,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: 'E_SOCIAL_BLOCKED' })

    mocks.findEpisode.mockResolvedValueOnce({ ...EPISODE, ageRating: 'A15' })
    await expect(
      getPlayback({
        episodeId: EPISODE.id,
        session: SESSION,
        cookieHeader: null,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: 'E_PERM_AGE_RESTRICTED' })

    mocks.findEpisode.mockResolvedValueOnce({
      ...EPISODE,
      asset: { ...EPISODE.asset, status: 'TRANSCODING' },
    })
    await expect(
      getPlayback({
        episodeId: EPISODE.id,
        session: SESSION,
        cookieHeader: null,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: 'E_ASSET_NOT_READY' })
  })

  it('allows the owner and moderators to inspect an unpublished episode', async () => {
    mocks.findEpisode.mockResolvedValue({ ...EPISODE, status: 'DRAFT' })
    const owner = {
      ...SESSION,
      userId: EPISODE.ownerId,
      user: { ...SESSION.user, id: EPISODE.ownerId, role: 'CREATOR' as const },
    }
    const moderator = {
      ...SESSION,
      user: { ...SESSION.user, role: 'MODERATOR' as const },
    }
    await expect(
      getPlayback({
        episodeId: EPISODE.id,
        session: owner,
        cookieHeader: null,
        now: NOW,
      }),
    ).resolves.toMatchObject({ episodeId: EPISODE.id })
    await expect(
      getPlayback({
        episodeId: EPISODE.id,
        session: moderator,
        cookieHeader: null,
        now: NOW,
      }),
    ).resolves.toMatchObject({ episodeId: EPISODE.id })
  })

  it('accepts only a matching, unexpired signed age cookie', async () => {
    mocks.findEpisode.mockResolvedValue({ ...EPISODE, ageRating: 'A15' })
    const cookie =
      createAgeVerificationCookie({
        claim: {
          episodeId: EPISODE.id,
          ageRating: 'A15',
          expiresAt: Math.floor(NOW.getTime() / 1000) + 3600,
        },
        secret: AUTH_SECRET,
        secure: false,
      }).split(';')[0] ?? ''
    await expect(
      getPlayback({
        episodeId: EPISODE.id,
        session: SESSION,
        cookieHeader: cookie,
        now: NOW,
      }),
    ).resolves.toMatchObject({ episodeId: EPISODE.id })
  })
})

describe('confirmAge', () => {
  it('issues an episode-scoped signed cookie without persisting birth year', async () => {
    mocks.findEpisode.mockResolvedValue({ ...EPISODE, ageRating: 'A19' })
    const result = await confirmAge({
      episodeId: EPISODE.id,
      confirmation: { confirmed: true, birthYear: 2000 },
      session: SESSION,
      now: NOW,
    })
    expect(result.setCookie).toContain('HttpOnly')
    expect(result.setCookie).toContain(
      `Path=/api/episodes/${EPISODE.id}/playback`,
    )
    expect(result.setCookie).not.toContain('2000')
  })

  it('rejects anonymous and underage A19 confirmations', async () => {
    mocks.findEpisode.mockResolvedValue({ ...EPISODE, ageRating: 'A19' })
    await expect(
      confirmAge({
        episodeId: EPISODE.id,
        confirmation: { confirmed: true, birthYear: 2000 },
        session: null,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: 'E_AUTH_REQUIRED' })
    await expect(
      confirmAge({
        episodeId: EPISODE.id,
        confirmation: { confirmed: true, birthYear: 2010 },
        session: SESSION,
        now: NOW,
      }),
    ).rejects.toMatchObject({ code: 'E_PERM_AGE_RESTRICTED' })
  })
})

describe('saveProgress', () => {
  it('upserts progress and rate-limits updates inside 15 seconds', async () => {
    await saveProgress({
      episodeId: EPISODE.id,
      progress: { positionSec: 30 },
      session: SESSION,
      now: NOW,
    })
    expect(mocks.upsertProgress).toHaveBeenCalledWith({
      userId: SESSION.userId,
      episodeId: EPISODE.id,
      positionSec: 30,
      completed: false,
    })

    mocks.findProgress.mockResolvedValue({
      updatedAt: new Date(NOW.getTime() - 14_000),
    })
    await expect(
      saveProgress({
        episodeId: EPISODE.id,
        progress: { positionSec: 45, completed: true },
        session: SESSION,
        now: NOW,
      }),
    ).rejects.toMatchObject({
      code: 'E_RATE_LIMITED',
      detail: { retryAfterSec: 15 },
    })
  })
})

describe('countView', () => {
  it('deduplicates per UTC day and hashes anonymous IP addresses', async () => {
    await countView({
      episodeId: EPISODE.id,
      session: null,
      ip: '203.0.113.8',
      now: NOW,
    })
    const identity = hashIp('203.0.113.8', AUTH_SECRET)
    expect(mocks.setIfAbsent).toHaveBeenCalledWith(
      `view:${EPISODE.id}:${identity}:20260824`,
      '1',
      86_400,
    )
    expect(mocks.setIfAbsent.mock.calls[0]?.[0]).not.toContain('203.0.113.8')
    expect(mocks.incr).toHaveBeenCalledWith(`viewbuf:${EPISODE.id}`)

    mocks.setIfAbsent.mockResolvedValue(false)
    await countView({
      episodeId: EPISODE.id,
      session: SESSION,
      ip: 'ignored',
      now: NOW,
    })
    expect(mocks.incr).toHaveBeenCalledTimes(1)
  })
})
