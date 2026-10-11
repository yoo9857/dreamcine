import { expect, test } from '@playwright/test'

test.use({ bypassCSP: process.env.SEARCH_QA_DEV === '1' })
test.setTimeout(60000)

for (const width of [320, 390, 768, 1440]) {
  test(`collection destinations keep their format and fit ${String(width)}px`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 1000 })
    for (const query of [
      'sort=popular',
      'sort=latest',
      'format=long',
      'format=short',
    ]) {
      const response = await page.goto(`/works?${query}`)
      expect(response?.status()).toBe(200)
      await expect(
        page.getByRole('heading', { level: 1, name: '작품' }),
      ).toBeVisible()
      await expect(page.locator('main')).toHaveCount(1)
      if (query.includes('short')) {
        await expect(page.locator('#long-form')).toHaveCount(0)
        await expect(
          page.getByRole('button', { name: 'SHORT FORM' }),
        ).toHaveAttribute('aria-pressed', 'true')
      } else if (query.includes('long')) {
        await expect(page.locator('#short-form')).toHaveCount(0)
        await expect(
          page.getByRole('button', { name: 'LONG FORM' }),
        ).toHaveAttribute('aria-pressed', 'true')
      } else {
        await expect(
          page.locator('.works-sort-nav a[aria-current="page"]'),
        ).toHaveText(query.includes('popular') ? '인기순' : '최신순')
      }
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true)
    }
    await page.screenshot({
      path: testInfo.outputPath(`shorts-${String(width)}.png`),
    })
    await page.getByRole('button', { name: 'LONG FORM' }).click()
    await expect(page).toHaveURL(/format=long/u)
    await page.goBack()
    await expect(
      page.getByRole('button', { name: 'SHORT FORM' }),
    ).toHaveAttribute('aria-pressed', 'true')
    await page.reload()
    await expect(page.locator('#long-form')).toHaveCount(0)
    await page.getByRole('link', { name: '인기순', exact: true }).click()
    await expect(page).toHaveURL(/sort=popular&format=short/u)
    await expect(page.locator('#long-form')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}

test('every browse shelf opens its actual collection', async ({ page }) => {
  test.skip(
    process.env.SEARCH_QA_DEV !== '1',
    'Uses the local authenticated preview',
  )
  for (const [label, destination] of [
    ['지금 가장 많이 보는 이야기', '/works?sort=popular'],
    ['새로 올라온 이야기', '/works?sort=latest'],
    ['깊이 몰입하는 롱폼', '/works?format=long'],
    ['짧게 발견하는 숏폼', '/works?format=short'],
    ['Higgsfield 영화제 큐레이션', '/u/higgsfield'],
  ] as const) {
    const response = await page.goto('/browse')
    expect(await response?.text()).not.toContain('취향이 열리는 순간')
    await page
      .getByRole('link', { name: `${label} 모두 보기`, exact: true })
      .click()
    await expect(page).toHaveURL(
      new RegExp(`${destination.replace(/[?]/gu, '\\?')}$`, 'u'),
    )
    if (destination.startsWith('/works')) {
      await expect(
        page.getByRole('heading', { level: 1, name: '작품' }),
      ).toBeVisible()
    } else {
      await expect(
        page.getByRole('heading', { level: 1, name: /Higgsfield/u }),
      ).toBeVisible()
      await expect(
        page.getByRole('link', { name: /THREAD/u }).first(),
      ).toBeVisible()
    }
  }
})
