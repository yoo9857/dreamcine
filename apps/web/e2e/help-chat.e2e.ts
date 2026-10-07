import { expect, test } from './fixtures'

for (const viewport of [
  { width: 320, height: 568 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 1366, height: 768 },
]) {
  test(`corner character opens a usable Q&A panel at ${String(viewport.width)}x${String(viewport.height)}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    const response = await page.goto('/creator-apply')
    expect(response?.status()).toBe(200)
    await page
      .getByRole('navigation', { name: '크리에이터 모집 페이지' })
      .getByRole('link', { name: '지원서 신청' })
      .click()
    const next = page.getByRole('button', { name: /^다음 단계/ })
    await expect
      .poll(() =>
        next.evaluate((button) => {
          const box = button.getBoundingClientRect()
          return (
            document
              .elementFromPoint(box.right - 8, box.y + box.height / 2)
              ?.closest('button') === button
          )
        }),
      )
      .toBe(true)
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: '고객 상담', exact: true }).click()
    const panel = page.getByRole('dialog', { name: '고객 상담' })
    await expect(panel).toBeVisible()
    const input = panel.getByRole('textbox')
    await expect(input).toBeVisible()
    const box = await input.boundingBox()
    expect(box).not.toBeNull()
    if (box === null) throw new Error('Input has no layout box')
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
    expect(box.y).toBeGreaterThan(0)
    await panel
      .getByRole('button', { name: 'ilog가 어떤 서비스인가요?' })
      .click()
    await expect(panel.getByText(/AI 드라마와 AI 영화/)).toBeVisible()
    await expect(
      panel.getByRole('link', { name: 'ilog 소개' }),
    ).toHaveAttribute('href', '/about')
    await panel.getByRole('button', { name: '대화 삭제' }).click()
    await expect(
      panel.getByRole('button', { name: 'ilog가 어떤 서비스인가요?' }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(panel).toHaveCount(0)
    await expect(
      page.getByRole('button', { name: '고객 상담', exact: true }),
    ).toBeFocused()
  })
}

test('login page exposes help and retries a rate-limited request', async ({
  page,
}) => {
  let attempts = 0
  await page.route('**/api/help/chat', async (route) => {
    attempts++
    await route.fulfill({
      status: attempts === 1 ? 429 : 200,
      contentType: 'application/json',
      body: JSON.stringify(
        attempts === 1
          ? { error: 'RATE_LIMITED' }
          : { answer: '연결되었습니다.', href: null, linkLabel: null },
      ),
    })
  })
  expect((await page.goto('/login'))?.status()).toBe(200)
  await page.getByRole('button', { name: '고객 상담', exact: true }).click()
  const panel = page.getByRole('dialog')
  await panel.getByRole('textbox').fill('로그인 방법')
  await panel.getByRole('button', { name: '보내기' }).click()
  await expect(panel.getByText(/질문이 잠시 몰렸어요/)).toBeVisible()
  await panel.getByRole('button', { name: '다시 시도' }).click()
  await expect(panel.getByText('연결되었습니다.')).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: '고객 상담', exact: true }).click()
  await expect(
    page.getByRole('dialog').getByText('연결되었습니다.'),
  ).toBeVisible()
})

test('application questions are answered as service guidance rather than catalog searches', async ({
  page,
}) => {
  await page.goto('/creator-apply')
  await page.getByRole('button', { name: '고객 상담', exact: true }).click()
  const panel = page.getByRole('dialog')
  await panel.getByRole('textbox').fill('크리에이터 어디서지원해?')
  const reply = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/help/chat') &&
      response.request().method() === 'POST',
  )
  await panel.getByRole('button', { name: '보내기' }).click()
  expect(await (await reply).json()).toMatchObject({
    source: 'guide',
    href: '/creator-apply',
  })
  await expect(
    panel.getByRole('link', { name: '크리에이터 지원' }),
  ).toBeVisible()
  await expect(panel.getByText(/해당하는 공개 작품/)).toHaveCount(0)
})
