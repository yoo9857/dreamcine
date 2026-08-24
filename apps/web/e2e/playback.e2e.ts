import { randomUUID } from 'node:crypto'

import {
  createAsset,
  createAuthSession,
  createEpisode,
  createRendition,
  createSeries,
  createUser,
  deleteAuthSession,
  disconnectDb,
  updateAssetStatus,
  updateEpisode,
  updateEpisodeStatus,
} from '@aidream/db'
import type { BrowserContext } from '@playwright/test'

import { expect, test } from './fixtures'

const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:3000'

async function playbackFixture(context: BrowserContext): Promise<{
  episodeId: string
  sessionToken: string
}> {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10)
  const user = await createUser({
    email: `playback-${suffix}@example.com`,
    handle: `play_${suffix}`,
    displayName: 'Playback E2E Viewer',
    role: 'CREATOR',
  })
  const series = await createSeries({
    ownerId: user.id,
    slug: `playback-${suffix}`,
    title: 'Playback E2E Series',
  })
  const asset = await createAsset({
    originalKey: `originals/${user.id}/playback.mp4`,
    sizeBytes: 1000n,
  })
  await updateAssetStatus(asset.id, 'READY', {
    hlsPrefix: `hls/${asset.id}`,
    masterPath: `hls/${asset.id}/master.m3u8`,
    posterKey: `thumbs/${asset.id}/poster.jpg`,
    durationSec: 120,
    width: 1280,
    height: 720,
    videoCodec: 'h264',
    audioCodec: 'aac',
    bitrateKbps: 2800,
    readyAt: new Date(),
  })
  await createRendition({
    assetId: asset.id,
    name: '720p',
    width: 1280,
    height: 720,
    bitrateKbps: 2800,
    playlistPath: `hls/${asset.id}/720p/index.m3u8`,
    sizeBytes: 1000n,
  })
  const episode = await createEpisode({
    seriesId: series.id,
    number: 1,
    title: 'Playback E2E Episode',
    ageRating: 'ALL',
  })
  await updateEpisode(episode.id, { assetId: asset.id })
  await updateEpisodeStatus(episode.id, 'PUBLISHED', {
    publishedAt: new Date(),
  })

  const sessionToken = randomUUID()
  await createAuthSession({
    sessionToken,
    userId: user.id,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  })
  await context.addCookies([
    {
      name: 'authjs.session-token',
      value: sessionToken,
      url: appUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  return { episodeId: episode.id, sessionToken }
}

test.afterAll(async () => {
  await disconnectDb()
})

test('US-03 a converted episode opens in the keyboard-accessible player', async ({
  page,
  context,
}) => {
  const fixture = await playbackFixture(context)
  try {
    await page.goto(`/watch/${fixture.episodeId}`)
    await expect(page.getByLabel('에피소드 동영상')).toBeVisible()
    await expect(page.getByRole('button', { name: '재생' })).toBeVisible()
    await expect(page.getByRole('slider', { name: '재생 위치' })).toBeVisible()
    await page.keyboard.press('k')
  } finally {
    await deleteAuthSession(fixture.sessionToken)
  }
})

test('US-04 saved progress is returned as the next playback start position', async ({
  page,
  context,
}) => {
  const fixture = await playbackFixture(context)
  try {
    const save = await page.request.post(
      `${appUrl}/api/episodes/${fixture.episodeId}/progress`,
      {
        headers: { origin: new URL(appUrl).origin },
        data: { positionSec: 42, completed: false },
      },
    )
    expect(save.status()).toBe(204)
    const playback = await page.request.get(
      `${appUrl}/api/episodes/${fixture.episodeId}/playback`,
    )
    expect(playback.status()).toBe(200)
    await expect(playback.json()).resolves.toMatchObject({ startAtSec: 42 })
  } finally {
    await deleteAuthSession(fixture.sessionToken)
  }
})
