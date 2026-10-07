import type { Page } from '@playwright/test'

import { expect, test } from './fixtures'

const pitch =
  '기억을 사고파는 도시를 배경으로 한 SF 단편을 만들고 싶어요. 기억을 잃은 주인공이 자신의 과거를 찾는 이야기입니다.'
async function advance(page: Page, step: number) {
  if (step === 0) {
    await page
      .getByRole('textbox', { name: '이름 또는 활동명' })
      .fill('테스트 작가')
    await page
      .getByRole('textbox', { name: '연락받을 이메일' })
      .fill('creator@example.com')
  } else if (step === 1)
    await page.getByRole('radio', { name: /작가 · 스토리/ }).check()
  else if (step === 2)
    await page
      .getByRole('textbox', { name: '대표 작품·포트폴리오 링크' })
      .fill('https://example.com/film')
  else if (step === 3)
    await page
      .getByRole('textbox', { name: 'ilog에서 만들고 싶은 이야기' })
      .fill(pitch)
  await page.getByRole('button', { name: /^다음 단계/ }).click()
}

test('지원서 검증, 이전 단계 유지, 실패 재시도와 접수현황이 동작한다', async ({
  page,
}) => {
  let attempts = 0
  await page.route('**/api/creator-applications', async (route) => {
    attempts++
    expect(route.request().postDataJSON()).toMatchObject({
      displayName: '테스트 작가',
      email: 'creator@example.com',
      track: 'WRITER',
      portfolioUrl: 'https://example.com/film',
      pitch,
      privacyConsent: true,
    })
    await route.fulfill({
      status: attempts === 1 ? 500 : 201,
      contentType: 'application/json',
      body: JSON.stringify(
        attempts === 1
          ? { error: { message: '다시 시도해 주세요.' } }
          : { id: 'TEST-APPLICATION' },
      ),
    })
  })
  const response = await page.goto('/creator-apply', {
    waitUntil: 'domcontentloaded',
  })
  expect(response?.status()).toBe(200)
  await page.getByRole('link', { name: '지금 지원서 작성하기' }).click()
  await page.getByRole('button', { name: /^다음 단계/ }).click()
  await expect(
    page.getByRole('textbox', { name: '이름 또는 활동명' }),
  ).toBeFocused()
  await advance(page, 0)
  await page.getByRole('button', { name: /^다음 단계/ }).click()
  await expect(
    page.getByText('지원할 분야를 하나 선택해 주세요.'),
  ).toBeVisible()
  await advance(page, 1)
  await advance(page, 2)
  await page
    .getByRole('textbox', { name: 'ilog에서 만들고 싶은 이야기' })
    .fill('짧은 이야기')
  await page.getByRole('button', { name: /^다음 단계/ }).click()
  await expect(page.getByText(/앞뒤 공백을 제외하고 40자 이상/)).toBeVisible()
  await advance(page, 3)
  await page.getByRole('button', { name: '이전', exact: true }).click()
  await expect(
    page.getByRole('textbox', { name: 'ilog에서 만들고 싶은 이야기' }),
  ).toHaveValue(pitch)
  await page.getByRole('button', { name: /^다음 단계/ }).click()
  await advance(page, 4)
  await page.getByRole('button', { name: '지원서 제출하기' }).click()
  expect(attempts).toBe(0)
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: '지원서 제출하기' }).click()
  await expect(page.locator('#apply').getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: '지원서 제출하기' }).click()
  await expect(page.getByRole('status')).toBeFocused()
  await page
    .getByRole('navigation', { name: '크리에이터 모집 페이지' })
    .getByRole('link', { name: '접수현황' })
    .click()
  await expect(
    page
      .getByRole('region', { name: '접수현황', exact: true })
      .getByText('TEST-APPLICATION'),
  ).toBeVisible()
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(
    page
      .getByRole('region', { name: '접수현황', exact: true })
      .getByText('TEST-APPLICATION'),
  ).toBeVisible()
})

test('모집 분야에서 선택한 역할을 유지하며 기본 정보부터 작성한다', async ({
  page,
}) => {
  await page.goto('/creator-apply#tracks', { waitUntil: 'domcontentloaded' })
  await page.getByRole('link', { name: /연출 · 감독/ }).click()
  await expect(
    page.getByRole('textbox', { name: '이름 또는 활동명' }),
  ).toBeVisible()
  await advance(page, 0)
  await expect(page.getByRole('radio', { name: /연출 · 감독/ })).toBeChecked()
})

const sizes = [
  [1920, 1080],
  [1366, 768],
  [1280, 720],
  [1024, 768],
  [768, 1024],
  [390, 844],
  [360, 640],
  [320, 568],
  [844, 390],
] as const
for (const [width, height] of sizes) {
  test(`${String(width)}×${String(height)}에서 모든 화면과 6단계 지원서가 스크롤 없이 보인다`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height })
    const response = await page.goto('/creator-apply', {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status()).toBe(200)
    const nav = page.getByRole('navigation', { name: '크리에이터 모집 페이지' })
    await expect(nav.getByRole('link')).toHaveText([
      '우리들은?',
      '지원서 신청',
      '접수현황',
      'Q&A',
      '혜택',
    ])
    for (const label of ['우리들은?', '접수현황', 'Q&A', '혜택']) {
      await nav.getByRole('link', { name: label, exact: true }).click()
      const layout = await page
        .getByRole('region', { name: '크리에이터 모집 안내' })
        .evaluate((el) => {
          const content = Array.from(el.querySelectorAll('section')).find(
            (section) => !section.hidden,
          )
          const actions = el.lastElementChild?.getBoundingClientRect()
          return {
            contentBottom: content?.getBoundingClientRect().bottom ?? Infinity,
            actionsTop:
              getComputedStyle(el).flexDirection === 'column'
                ? (actions?.top ?? 0)
                : el.getBoundingClientRect().bottom,
            actionsBottom: actions?.bottom ?? Infinity,
            height: innerHeight,
          }
        })
      expect(
        layout.contentBottom,
        `${label}: content fits`,
      ).toBeLessThanOrEqual(layout.actionsTop + 1)
      expect(layout.actionsBottom).toBeLessThanOrEqual(layout.height)
    }
    await nav.getByRole('link', { name: '지원서 신청' }).click()
    for (let step = 0; step < 6; step++) {
      const layout = await page.locator('#apply').evaluate((form) => {
        const fields = form.querySelector('fieldset')
        const button = form
          .querySelector('button[type="submit"]')
          ?.getBoundingClientRect()
        return {
          fieldsHeight: fields?.clientHeight ?? 0,
          fieldsContent: fields?.scrollHeight ?? Infinity,
          buttonBottom: button?.bottom ?? Infinity,
          viewport: innerHeight,
          documentOverflow:
            document.documentElement.scrollHeight > innerHeight ||
            document.documentElement.scrollWidth > innerWidth,
        }
      })
      expect(
        layout.fieldsContent,
        `step ${String(step)}: no internal overflow`,
      ).toBeLessThanOrEqual(layout.fieldsHeight + 2)
      expect(layout.buttonBottom).toBeLessThanOrEqual(layout.viewport)
      expect(layout.documentOverflow).toBe(false)
      if (step < 5) await advance(page, step)
    }
  })
}

test('소개 화면 로딩 완료와 메뉴 전환 뒤에도 배경 영상이 계속 보인다', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as Window & { creatorWrongScreen?: boolean }
    new MutationObserver(() => {
      const title = document.getElementById('creator-call-title')
      if (
        location.hash === '#about' &&
        title &&
        title.getClientRects().length > 0 &&
        getComputedStyle(title).visibility !== 'hidden'
      )
        state.creatorWrongScreen = true
    }).observe(document, { childList: true, subtree: true, attributes: true })
  })
  const response = await page.goto('/creator-apply#about', {
    waitUntil: 'domcontentloaded',
  })
  expect(response?.status()).toBe(200)
  expect(
    await page.evaluate(
      () =>
        (window as Window & { creatorWrongScreen?: boolean })
          .creatorWrongScreen,
    ),
  ).not.toBe(true)
  const video = page.locator('video')
  const initialBounds = await video.boundingBox()
  const headerBounds = await page.locator('header').boundingBox()
  await expect(video).toHaveCount(1)
  await expect(video).toBeVisible()
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.readyState))
    .toBeGreaterThanOrEqual(2)
  await expect(
    page.getByRole('heading', { name: '새로운 도구로, 오래 남을 이야기.' }),
  ).toBeVisible()
  const originalVideo = await video.elementHandle()
  const before = await video.evaluate((el: HTMLVideoElement) => el.currentTime)
  await expect
    .poll(() => video.evaluate((el: HTMLVideoElement) => el.currentTime))
    .not.toBe(before)
  await expect(page.locator('[style*="background-image"]')).toHaveCount(0)
  await page.getByRole('link', { name: '모집 분야', exact: true }).click()
  await expect(video).toHaveCount(1)
  expect(await originalVideo?.evaluate((el) => el.isConnected)).toBe(true)
  await page.getByRole('link', { name: '지원 절차', exact: true }).click()
  await expect(video).toBeVisible()
  await page.evaluate(() => {
    window.location.hash = 'top'
  })
  await expect(
    page.getByRole('heading', { name: 'AI 영화와 드라마, 함께 만들어요.' }),
  ).toBeVisible()
  await expect(video).toHaveCount(1)
  expect(await video.boundingBox()).toEqual(initialBounds)
  expect(await page.locator('header').boundingBox()).toEqual(headerBounds)
  await expect(page.locator('[style*="background-image"]')).toHaveCount(0)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(video).toHaveCount(1)
  await expect(
    page.getByRole('heading', { name: 'AI 영화와 드라마, 함께 만들어요.' }),
  ).toBeVisible()
})

test('동작 줄이기에서는 같은 장면의 정지 배경을 보여준다', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/creator-apply', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('video')).toHaveCount(0)
  await expect(page.locator('[style*="background-image"]')).toHaveCount(1)
  await expect(
    page.getByRole('heading', { name: 'AI 영화와 드라마, 함께 만들어요.' }),
  ).toBeVisible()
})

test('모바일에서는 가벼운 배경 영상만 요청한다', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const videoRequests: string[] = []
  page.on('request', (request) => {
    if (
      request.url().includes('ilog-cinematic') &&
      request.url().endsWith('.mp4')
    )
      videoRequests.push(request.url())
  })
  const response = await page.goto('/creator-apply#about', {
    waitUntil: 'domcontentloaded',
  })
  expect(response?.status()).toBe(200)
  await expect
    .poll(() =>
      page.locator('video').evaluate((video: HTMLVideoElement) => ({
        ready: video.readyState >= 2,
        source: new URL(video.currentSrc).pathname,
      })),
    )
    .toEqual({
      ready: true,
      source: '/brand/creator/ilog-cinematic-mobile.mp4',
    })
  expect(videoRequests.length).toBeGreaterThan(0)
  expect(
    videoRequests.every((url) => url.includes('ilog-cinematic-mobile')),
  ).toBe(true)
})
