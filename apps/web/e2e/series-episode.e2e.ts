import { randomUUID } from 'node:crypto'

import { checkEpisodeTransition } from '@aidream/core'
import {
  createAsset,
  createAuthSession,
  createUploadSession,
  createUser,
  deleteAuthSession,
  disconnectDb,
  findUserByEmail,
  listScheduledEpisodesDue,
  setUserEmailVerified,
  transitionEpisode,
  updateAssetStatus,
} from '@aidream/db'
import type { BrowserContext, Page } from '@playwright/test'

import { expect, test } from './fixtures'

const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:3000'
const CREATOR_EMAIL = 'series-episode-e2e@example.com'

async function creatorSession(
  context: BrowserContext,
): Promise<{ sessionToken: string; userId: string }> {
  const existing = await findUserByEmail(CREATOR_EMAIL)
  const user =
    existing ??
    (await createUser({
      email: CREATOR_EMAIL,
      handle: 'series_episode_e2e',
      displayName: '시리즈 E2E 크리에이터',
      role: 'CREATOR',
    }))
  await setUserEmailVerified(user.id, new Date())
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
  return { sessionToken, userId: user.id }
}

async function readyAsset(userId: string): Promise<string> {
  const uploadId = randomUUID()
  const objectKey = `originals/${userId}/${uploadId}/episode.mp4`
  await createUploadSession({
    id: uploadId,
    userId,
    fileName: 'episode.mp4',
    fileSize: 1024n,
    mimeType: 'video/mp4',
    objectKey,
    partSize: 1024,
    totalParts: 1,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  })
  const asset = await createAsset({ uploadId, originalKey: objectKey })
  await updateAssetStatus(asset.id, 'READY', { readyAt: new Date() })
  return asset.id
}

async function createSeriesAndEpisode(
  page: Page,
  userId: string,
  title: string,
): Promise<void> {
  await page.goto('/studio/series/new')
  await page.getByLabel('시리즈 제목').fill(title)
  await page.getByRole('button', { name: '시리즈 만들기' }).click()
  await expect(page).toHaveURL(/\/studio\/series\/[^/]+$/u)

  const assetId = await readyAsset(userId)
  await page.getByLabel('회차').fill('1')
  await page.getByLabel('에피소드 제목').fill('첫 번째 꿈')
  await page.getByLabel('준비된 영상 자산 ID').fill(assetId)
  await page
    .getByLabel('AI 제작 표기')
    .fill('생성형 AI로 배경과 음향을 제작했습니다.')
  await page.getByRole('button', { name: '에피소드 추가' }).click()
  await expect(page.getByText('첫 번째 꿈')).toBeVisible()
}

async function publishDue(now: Date): Promise<number> {
  const due = await listScheduledEpisodesDue(now, 100)
  let published = 0
  for (const record of due) {
    const verdict = checkEpisodeTransition({
      current: record.episode.status,
      next: 'PUBLISHED',
      assetStatus: record.assetStatus,
      aiDisclosure: record.episode.aiDisclosure,
      publishAt: record.episode.publishAt,
      publishedAt: record.episode.publishedAt,
      now,
      actor: { kind: 'SCHEDULER' },
    })
    if (!verdict.ok) continue
    await transitionEpisode(record.episode.id, 'PUBLISHED', verdict.patch)
    published += 1
  }
  return published
}

test.afterAll(async () => {
  await disconnectDb()
})

test('US-02 크리에이터가 시리즈를 만들고 첫 에피소드를 공개한다', async ({
  page,
  context,
}) => {
  const session = await creatorSession(context)
  try {
    await createSeriesAndEpisode(page, session.userId, `US-02 ${randomUUID()}`)
    await page.getByRole('button', { name: '공개' }).click()
    await expect(page.getByText('공개')).toBeVisible()
  } finally {
    await deleteAuthSession(session.sessionToken)
  }
})

test('US-08 예약 에피소드가 예정 시각에 한 번만 공개된다', async ({
  page,
  context,
}) => {
  const session = await creatorSession(context)
  try {
    await createSeriesAndEpisode(page, session.userId, `US-08 ${randomUUID()}`)
    const publishAt = new Date(Date.now() + 1_500)
    page.once('dialog', (dialog) => dialog.accept(publishAt.toISOString()))
    await page.getByRole('button', { name: '예약' }).click()
    await expect(page.getByText('예약')).toBeVisible()
    await expect
      .poll(() => Date.now())
      .toBeGreaterThanOrEqual(publishAt.getTime())

    expect(await publishDue(new Date())).toBe(1)
    await page.reload()
    await expect(page.getByText('공개')).toBeVisible()

    expect(await publishDue(new Date())).toBe(0)
  } finally {
    await deleteAuthSession(session.sessionToken)
  }
})
