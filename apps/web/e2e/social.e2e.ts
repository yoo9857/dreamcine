import { randomUUID } from 'node:crypto'

import {
  createAuthSession,
  createEpisode,
  createSeries,
  createUser,
  updateEpisodeStatus,
} from '@aidream/db'

import { expect, test } from './fixtures'

const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:3000'

test('US-06 좋아요와 댓글이 반영되고 제작자가 알림을 받는다', async ({
  browser,
  page,
}) => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10)
  const [viewer, creator] = await Promise.all([
    createUser({
      handle: `social_viewer_${suffix}`,
      email: `social_viewer_${suffix}@example.com`,
      displayName: '소셜 시청자',
    }),
    createUser({
      handle: `social_creator_${suffix}`,
      email: `social_creator_${suffix}@example.com`,
      displayName: '소셜 제작자',
      role: 'CREATOR',
    }),
  ])
  const series = await createSeries({
    ownerId: creator.id,
    slug: `social-${suffix}`,
    title: '소셜 테스트 시리즈',
  })
  const episode = await createEpisode({
    seriesId: series.id,
    number: 1,
    title: '소셜 테스트 에피소드',
  })
  await updateEpisodeStatus(episode.id, 'PUBLISHED', {
    publishedAt: new Date(),
  })

  const viewerToken = `social-viewer-${suffix}`
  await createAuthSession({
    sessionToken: viewerToken,
    userId: viewer.id,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  })
  await page.context().addCookies([
    {
      name: 'authjs.session-token',
      value: viewerToken,
      url: appUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])

  await page.goto(`/u/${creator.handle}`)
  await page.getByRole('button', { name: /팔로우/u }).click()
  await expect(page.getByRole('button', { name: /팔로잉/u })).toBeVisible()

  const requestHeaders = { origin: new URL(appUrl).origin }
  const like = await page.request.put(`/api/episodes/${episode.id}/likes`, {
    headers: requestHeaders,
  })
  expect(like.status()).toBe(200)
  expect(await like.json()).toMatchObject({ liked: true, likeCount: 1 })
  const comment = await page.request.post(
    `/api/episodes/${episode.id}/comments`,
    {
      headers: requestHeaders,
      data: { body: '새 에피소드가 재미있습니다.' },
    },
  )
  expect(comment.status()).toBe(201)

  const creatorToken = `social-creator-${suffix}`
  await createAuthSession({
    sessionToken: creatorToken,
    userId: creator.id,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  })
  const creatorContext = await browser.newContext()
  await creatorContext.addCookies([
    {
      name: 'authjs.session-token',
      value: creatorToken,
      url: appUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  const creatorPage = await creatorContext.newPage()
  await creatorPage.goto('/notifications')
  await expect(creatorPage.getByText('새 팔로워가 생겼습니다.')).toBeVisible()
  await expect(
    creatorPage.getByText('에피소드에 새 좋아요가 있습니다.'),
  ).toBeVisible()
  await expect(
    creatorPage.getByText('에피소드에 새 댓글이 있습니다.'),
  ).toBeVisible()
  await creatorContext.close()
})
