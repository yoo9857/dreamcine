import { expect, test } from '@playwright/test'
import { SearchResultSchema } from '@aidream/core'
import { z } from 'zod'

// Dev's React Refresh needs eval. This option applies only to an explicitly
// selected local dev test run; deployed smoke runs keep the real CSP enabled.
test.use({ bypassCSP: process.env.SEARCH_QA_DEV === '1' })

const creator = {
  handle: 'fire-creator',
  displayName: 'Fire Studio',
  avatarUrl: null,
  tier: 'GOLD',
  isVerified: true,
}
const episode = (id: string) => ({
  type: 'episode',
  episode: {
    episodeId: id,
    title: `Fire · ${id}`,
    thumbUrl: null,
    durationSec: 95,
    ageRating: 'ALL',
    viewCount: '1234',
    likeCount: 12,
    publishedAt: '2026-10-11T00:00:00.000Z',
    series: { id: 'fire-series', title: 'Fire stories', slug: 'fire' },
    creator,
    isLiked: false,
  },
})

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.startsWith('live production')) return
  await page.route('**/api/search?*', async (route) => {
    const params = new URL(route.request().url()).searchParams
    const type = params.get('type')
    const items =
      params.get('q') === 'empty'
        ? []
        : type === 'series'
          ? [
              {
                type: 'series',
                id: 'fire-series',
                slug: 'fire',
                title: 'Fire stories',
                posterUrl: null,
                creator,
              },
            ]
          : type === 'user'
            ? [{ type: 'user', ...creator, followerCount: 1234 }]
            : (params.has('cursor')
                ? ['second']
                : [
                    'first',
                    'scene-2',
                    'scene-3',
                    'scene-4',
                    'scene-5',
                    'scene-6',
                  ]
              ).map((id) => {
                const item = episode(id)
                return {
                  ...item,
                  episode: {
                    ...item.episode,
                    thumbUrl: new URL(
                      '/brand/works/red-horizon.png',
                      route.request().url(),
                    ).href,
                  },
                }
              })
    await route.fulfill({
      json: {
        items,
        nextCursor:
          type === 'episode' && !params.has('cursor') && items.length > 0
            ? 'next'
            : null,
      },
    })
  })
})

test('live production results satisfy their contract and render in each category', async ({
  page,
  request,
}, testInfo) => {
  test.skip(process.env.SEARCH_QA_DEV === '1', 'Requires the deployed database')
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const schema = z.object({
    items: z.array(SearchResultSchema),
    nextCursor: z.string().nullable(),
  })
  for (const type of ['episode', 'series', 'user']) {
    const query = type === 'user' ? 'hanbin' : 'fire'
    const response = await request.get(
      `/api/search?q=${query}&type=${type}&limit=20`,
    )
    expect(response.ok()).toBe(true)
    const data = schema.parse(await response.json())
    expect(data.items.length).toBeGreaterThan(0)
    await page.goto(`/search?q=${query}&type=${type}`)
    await expect(page.locator('.search-grid')).toBeVisible()
    await expect(
      page.locator('.search-grid').locator(':scope > *'),
    ).toHaveCount(data.items.length)
    await expect(
      page.getByText('검색 결과를 불러오지 못했습니다.', { exact: false }),
    ).toHaveCount(0)
    await page.screenshot({
      path: testInfo.outputPath(`live-${type}.png`),
      fullPage: true,
    })
  }
  expect(errors).toEqual([])
})

for (const width of [320, 390, 768, 1024, 1366, 1440]) {
  test(`search layout fits ${String(width)}px and exposes usable controls`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/search?q=fire')
    await expect(
      page.getByRole('heading', { name: 'Fire · first' }),
    ).toBeVisible()
    await expect(page.getByRole('searchbox')).toBeVisible()
    await expect(
      page.getByRole('button', { name: '검색', exact: true }),
    ).toBeVisible()
    await expect(page.locator('.aidream-session-actions')).toHaveCount(0)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    const input = await page.getByRole('searchbox').boundingBox()
    expect(input?.width).toBeGreaterThan(95)
    await expect(page.locator('.search-hero')).toHaveCount(0)
    const firstResult = await page
      .locator('.search-grid .episode-card')
      .first()
      .boundingBox()
    expect(firstResult?.height).toBeLessThan(140)
    expect(firstResult?.y).toBeLessThan(320)
    await page.screenshot({
      path: testInfo.outputPath(`search-${String(width)}.png`),
      fullPage: true,
    })
  })
}

test('search, categories, pagination, keyboard navigation and browser history work together', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/search?q=fire')
  await expect(
    page.getByRole('heading', { name: 'Fire · first' }),
  ).toBeVisible()
  await page.getByRole('button', { name: '검색 결과 더 보기' }).click()
  await expect(
    page.getByRole('heading', { name: 'Fire · second' }),
  ).toBeVisible()
  await page.getByRole('tab', { name: '시리즈', exact: true }).click()
  await expect(page).toHaveURL(/type=series/u)
  await expect(
    page.getByRole('heading', { name: 'Fire stories' }),
  ).toBeVisible()
  await page
    .getByRole('tab', { name: '시리즈', exact: true })
    .press('ArrowRight')
  await expect(page.getByRole('tab', { name: '크리에이터' })).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(
    page.getByRole('link', { name: /팔로워 1,234명/u }),
  ).toBeVisible()
  await page.goBack()
  await expect(
    page.getByRole('tab', { name: '시리즈', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('searchbox').fill('empty')
  await page.getByRole('searchbox').press('Enter')
  await expect(page.getByText('검색 결과가 없습니다')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('searchbox')).toHaveValue('empty')
  await expect(
    page.getByRole('tab', { name: '시리즈', exact: true }),
  ).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('button', { name: '검색어 지우기' }).click()
  await expect(page.getByRole('searchbox')).toBeFocused()
  await expect(page.getByRole('searchbox')).toHaveValue('')
  expect(errors).toEqual([])
})
