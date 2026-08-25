import { randomUUID } from 'node:crypto'

import {
  createAuthSession,
  createEpisode,
  createSeries,
  createUser,
  followUser,
  updateEpisodeStatus,
} from '@aidream/db'

import { expect, test } from './fixtures'

test('US-05 팔로우한 제작자의 피드를 무한스크롤로 탐색한다', async ({
  page,
}) => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10)
  const viewer = await createUser({
    handle: `viewer_${suffix}`,
    email: `viewer_${suffix}@example.com`,
    displayName: '피드 시청자',
  })
  const creator = await createUser({
    handle: `creator_${suffix}`,
    email: `creator_${suffix}@example.com`,
    displayName: '피드 제작자',
    role: 'CREATOR',
  })
  const series = await createSeries({
    ownerId: creator.id,
    slug: `feed-${suffix}`,
    title: `피드 시리즈 ${suffix}`,
  })
  const publishedAt = new Date('2026-08-25T00:00:00.000Z')
  for (let number = 1; number <= 25; number += 1) {
    const episode = await createEpisode({
      seriesId: series.id,
      number,
      title: `피드 에피소드 ${String(number).padStart(2, '0')}`,
    })
    await updateEpisodeStatus(episode.id, 'PUBLISHED', { publishedAt })
  }
  await followUser(viewer.id, creator.id)
  const sessionToken = `feed-session-${suffix}`
  await createAuthSession({
    sessionToken,
    userId: viewer.id,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  })
  await page.context().addCookies([
    {
      name: 'authjs.session-token',
      value: sessionToken,
      domain: '127.0.0.1',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])

  await page.goto('/following')
  await expect(page.getByRole('heading', { name: '팔로잉' })).toBeVisible()
  await expect(page.locator('article')).toHaveCount(20)
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight)
  })
  await expect(page.locator('article')).toHaveCount(25)

  const scrollBefore = await page.evaluate(() => window.scrollY)
  await page.locator('article a').last().click()
  await expect(page).toHaveURL(/\/watch\//u)
  await expect
    .poll(async () => {
      const stored = await page.evaluate(() =>
        window.sessionStorage.getItem('aidream:feed-scroll:/following'),
      )
      return stored === null ? 0 : Number(stored)
    })
    .toBeGreaterThanOrEqual(Math.max(0, scrollBefore - 100))
  await page.goBack()
  await expect(page).toHaveURL(/\/following$/u)
  await expect(page.getByRole('heading', { name: '팔로잉' })).toBeVisible()
  await expect
    .poll(async () => page.evaluate(() => window.scrollY))
    .toBeGreaterThanOrEqual(Math.max(0, scrollBefore - 100))
})
