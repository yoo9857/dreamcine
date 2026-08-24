import { randomUUID } from 'node:crypto'

import {
  createAuthSession,
  createUser,
  deleteAuthSession,
  disconnectDb,
  findUserByEmail,
  setUserEmailVerified,
} from '@aidream/db'
import { cdnOrigin } from '@aidream/storage/cdn'
import type { BrowserContext, Page, Route } from '@playwright/test'

import { expect, test } from './fixtures'

const appUrl = process.env.APP_URL ?? 'http://127.0.0.1:3000'
const storageOrigin = cdnOrigin() ?? 'http://127.0.0.1:9000'
const CREATOR_EMAIL = 'upload-e2e@example.com'

async function creatorSession(context: BrowserContext): Promise<string> {
  const existing = await findUserByEmail(CREATOR_EMAIL)
  const user =
    existing ??
    (await createUser({
      email: CREATOR_EMAIL,
      handle: 'upload_e2e_creator',
      displayName: '업로드 E2E 크리에이터',
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
  return sessionToken
}

function json(route: Route, body: unknown, status = 200): Promise<void> {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  })
}

interface MockUploadOptions {
  readonly totalParts: number
  readonly partDelayMs?: number
}

async function mockUpload(
  page: Page,
  options: MockUploadOptions,
): Promise<Set<number>> {
  const completed = new Set<number>()
  await page.route('**/api/uploads', async (route) => {
    await json(
      route,
      {
        uploadId: 'upl_e2e',
        partSize: 4,
        totalParts: options.totalParts,
        parts: Array.from({ length: options.totalParts }, (_, index) => ({
          partNumber: index + 1,
          url: `${storageOrigin}/e2e-upload/part-${String(index + 1)}`,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        })),
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      },
      201,
    )
  })
  await page.route(`${storageOrigin}/e2e-upload/part-*`, async (route) => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': appUrl,
          'Access-Control-Allow-Methods': 'PUT, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      })
      return
    }
    const match = /part-(\d+)$/u.exec(route.request().url())
    const partNumber = Number(match?.[1] ?? 0)
    if (options.partDelayMs !== undefined) {
      await new Promise((resolve) => setTimeout(resolve, options.partDelayMs))
    }
    completed.add(partNumber)
    await route.fulfill({
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': appUrl,
        'Access-Control-Expose-Headers': 'ETag',
        ETag: `"etag-${String(partNumber)}"`,
      },
    })
  })
  await page.route('**/api/uploads/upl_e2e', async (route) => {
    await json(route, {
      uploadId: 'upl_e2e',
      status: 'UPLOADING',
      fileName: 'episode.mp4',
      fileSize: options.totalParts * 4,
      partSize: 4,
      totalParts: options.totalParts,
      completedParts: [...completed].sort((left, right) => left - right),
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    })
  })
  await page.route('**/api/uploads/upl_e2e/parts', async (route) => {
    const body = route.request().postDataJSON() as { partNumbers: number[] }
    await json(
      route,
      body.partNumbers.map((partNumber) => ({
        partNumber,
        url: `${storageOrigin}/e2e-upload/part-${String(partNumber)}`,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      })),
    )
  })
  await page.route('**/api/uploads/upl_e2e/complete', async (route) => {
    await json(route, { assetId: 'ast_e2e', status: 'PENDING' }, 202)
  })
  await page.route('**/api/assets/ast_e2e', async (route) => {
    await json(route, { id: 'ast_e2e', status: 'READY', progress: 100 })
  })
  await page.route('**/api/uploads/upl_e2e/abort', async (route) => {
    await route.fulfill({ status: 204 })
  })
  return completed
}

test.afterAll(async () => {
  await disconnectDb()
})

test('US-02 크리에이터가 영상을 직접 업로드한다', async ({ page, context }) => {
  const sessionToken = await creatorSession(context)
  try {
    const completed = await mockUpload(page, { totalParts: 3 })
    await page.goto('/studio/upload')

    await page.getByLabel('업로드할 영상 선택').setInputFiles({
      name: 'episode.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('abcdefghijkl'),
    })

    await expect(page.getByText('영상 준비가 완료되었습니다')).toBeVisible()
    expect([...completed].sort()).toEqual([1, 2, 3])
  } finally {
    await deleteAuthSession(sessionToken)
  }
})

test('US-09 업로드를 멈췄다가 누락 파트만 이어서 올린다', async ({
  page,
  context,
}) => {
  const sessionToken = await creatorSession(context)
  try {
    const completed = await mockUpload(page, {
      totalParts: 4,
      partDelayMs: 200,
    })
    await page.goto('/studio/upload')
    await page.getByLabel('업로드할 영상 선택').setInputFiles({
      name: 'episode.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('abcdefghijklmnop'),
    })

    await page.getByRole('button', { name: '일시정지' }).click()
    await expect(page.getByText('업로드가 일시정지되었습니다')).toBeVisible()
    await expect
      .poll(() => completed.size, {
        message: '진행 중이던 세 파트가 끝나야 한다',
      })
      .toBe(3)

    await page.getByRole('button', { name: '이어서 올리기' }).click()

    await expect(page.getByText('영상 준비가 완료되었습니다')).toBeVisible()
    expect([...completed].sort()).toEqual([1, 2, 3, 4])
  } finally {
    await deleteAuthSession(sessionToken)
  }
})
