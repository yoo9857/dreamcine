import { randomUUID } from 'node:crypto'

import {
  createAuthSession,
  createEpisode,
  createSeries,
  createUser,
  findEpisodeById,
  updateEpisodeStatus,
} from '@aidream/db'

import { expect, test } from './fixtures'

const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:3000'

test('US-07 신고 → 자동 숨김 → 모더레이터 기각 복원', async ({
  browser,
  page,
}) => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10)
  const [viewer, creator, moderator] = await Promise.all([
    createUser({
      handle: `report_viewer_${suffix}`,
      email: `report_viewer_${suffix}@example.com`,
      displayName: '신고자',
    }),
    createUser({
      handle: `report_creator_${suffix}`,
      email: `report_creator_${suffix}@example.com`,
      displayName: '제작자',
      role: 'CREATOR',
    }),
    createUser({
      handle: `moderator_${suffix}`,
      email: `moderator_${suffix}@example.com`,
      displayName: '모더레이터',
      role: 'MODERATOR',
    }),
  ])
  const series = await createSeries({
    ownerId: creator.id,
    slug: `moderation-${suffix}`,
    title: '신고 테스트 시리즈',
  })
  const episode = await createEpisode({
    seriesId: series.id,
    number: 1,
    title: '신고 테스트 에피소드',
  })
  await updateEpisodeStatus(episode.id, 'PUBLISHED', {
    publishedAt: new Date(),
  })

  const viewerToken = `report-viewer-${suffix}`
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
  const reportResponse = await page.request.post('/api/reports', {
    headers: { origin: new URL(appUrl).origin },
    data: {
      target: 'EPISODE',
      targetId: episode.id,
      reason: 'MINOR_SAFETY',
    },
  })
  expect(reportResponse.status()).toBe(201)
  const report = (await reportResponse.json()) as { id: string }
  await expect
    .poll(async () => (await findEpisodeById(episode.id))?.status)
    .toBe('HIDDEN')

  const moderatorToken = `moderator-${suffix}`
  await createAuthSession({
    sessionToken: moderatorToken,
    userId: moderator.id,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  })
  const moderatorContext = await browser.newContext()
  await moderatorContext.addCookies([
    {
      name: 'authjs.session-token',
      value: moderatorToken,
      url: appUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  const action = await moderatorContext.request.post(
    `/api/admin/reports/${report.id}/action`,
    {
      headers: { origin: new URL(appUrl).origin },
      data: { action: 'REJECT', note: '오탐 확인' },
    },
  )
  expect(action.status()).toBe(200)
  await expect
    .poll(async () => (await findEpisodeById(episode.id))?.status)
    .toBe('PUBLISHED')
  await moderatorContext.close()
})

test('계정 정지는 두 활성 브라우저의 세션을 즉시 무효화한다', async ({
  browser,
}) => {
  const suffix = randomUUID().replaceAll('-', '').slice(0, 10)
  const [viewer, creator, admin] = await Promise.all([
    createUser({
      handle: `suspended_viewer_${suffix}`,
      email: `suspended_viewer_${suffix}@example.com`,
      displayName: '정지 대상',
    }),
    createUser({
      handle: `suspend_creator_${suffix}`,
      email: `suspend_creator_${suffix}@example.com`,
      displayName: '제작자',
      role: 'CREATOR',
    }),
    createUser({
      handle: `suspend_admin_${suffix}`,
      email: `suspend_admin_${suffix}@example.com`,
      displayName: '관리자',
      role: 'ADMIN',
    }),
  ])
  const series = await createSeries({
    ownerId: creator.id,
    slug: `suspension-${suffix}`,
    title: '정지 검증 시리즈',
  })
  const episode = await createEpisode({
    seriesId: series.id,
    number: 1,
    title: '정지 검증 에피소드',
  })
  await updateEpisodeStatus(episode.id, 'PUBLISHED', {
    publishedAt: new Date(),
  })

  const viewerTokens = [`viewer-a-${suffix}`, `viewer-b-${suffix}`]
  await Promise.all(
    viewerTokens.map((sessionToken) =>
      createAuthSession({
        sessionToken,
        userId: viewer.id,
        expires: new Date(Date.now() + 60 * 60 * 1000),
      }),
    ),
  )
  const viewerContexts = await Promise.all(
    viewerTokens.map(async (value) => {
      const context = await browser.newContext()
      await context.addCookies([
        {
          name: 'authjs.session-token',
          value,
          url: appUrl,
          httpOnly: true,
          sameSite: 'Lax',
        },
      ])
      return context
    }),
  )

  const adminToken = `admin-${suffix}`
  await createAuthSession({
    sessionToken: adminToken,
    userId: admin.id,
    expires: new Date(Date.now() + 60 * 60 * 1000),
  })
  const adminContext = await browser.newContext()
  await adminContext.addCookies([
    {
      name: 'authjs.session-token',
      value: adminToken,
      url: appUrl,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])

  try {
    const suspension = await adminContext.request.post(
      `/api/admin/users/${viewer.id}/status`,
      {
        headers: { origin: new URL(appUrl).origin },
        data: { status: 'SUSPENDED', reason: '두 브라우저 즉시 차단 검증' },
      },
    )
    expect(suspension.status()).toBe(200)

    const responses = await Promise.all(
      viewerContexts.map((context) =>
        context.request.post('/api/reports', {
          headers: { origin: new URL(appUrl).origin },
          data: {
            target: 'EPISODE',
            targetId: episode.id,
            reason: 'VIOLENCE',
          },
        }),
      ),
    )
    expect(responses.map((response) => response.status())).toEqual([401, 401])
  } finally {
    await Promise.all([
      adminContext.close(),
      ...viewerContexts.map((context) => context.close()),
    ])
  }
})
