import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'

test.setTimeout(90_000)
test.use({
  launchOptions:
    process.env.SEO_CHROME_PATH === undefined
      ? {}
      : { executablePath: process.env.SEO_CHROME_PATH },
})

test('home serves canonical identity and useful content before JavaScript', async ({
  request,
  baseURL,
}) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toContain('AI 영화와 드라마')
  expect(html).toContain('ilog는 어떤 서비스인가요?')
  expect(html).toContain('rel="canonical"')
  expect(html).toContain(`${baseURL ?? 'http://127.0.0.1:3000'}/`)
  expect(html).toContain('application/ld+json')
  expect(html.split('</head>')[0]).toContain(
    '<meta name="naver-site-verification" content="11bc2d88416b0daf74f2d77993bddeff9b94bb92"',
  )
  expect(html).toContain('https://schema.org')
  expect(html).toContain('#organization')
  expect(html).toContain('href="/works"')
  expect(html).toContain('href="/creators"')
  expect(html).toContain('property="og:image"')
  expect(html).toContain('name="twitter:image"')
  expect(html).toContain('/opengraph-image.png')
  expect(response.headers()['x-robots-tag']).toBeUndefined()
})

test('private redirects carry noindex while robots permits public discovery', async ({
  request,
}) => {
  const response = await request.get('/account', { maxRedirects: 0 })
  expect(response.status()).toBe(307)
  expect(response.headers()['x-robots-tag']).toBe('noindex, follow')
  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  const text = await robots.text()
  expect(text).toContain('Allow: /')
  expect(text).toContain('Disallow: /messages')
  expect(text).toContain('Sitemap:')
  expect(text.trimEnd()).toMatch(
    /#DaumWebMasterTool:440c59dff907fafe824210048b3154959ef635d762f58fbe99196210dcb94c33:98GztZ5EvdKnUPTh2E62HA==$/u,
  )
  expect(text).not.toContain('Disallow: /works')
})

test('social image is a real 1200 × 630 PNG', async ({ request }) => {
  const home = await request.get('/')
  const html = await home.text()
  const imageUrl = /<meta property="og:image" content="([^"]+)"/u.exec(
    html,
  )?.[1]
  if (imageUrl === undefined)
    throw new Error('home is missing its OG image URL')
  const response = await request.get(imageUrl)
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toContain('image/png')
  const png = await response.body()
  expect(png.subarray(1, 4).toString()).toBe('PNG')
  expect(png.readUInt32BE(16)).toBe(1200)
  expect(png.readUInt32BE(20)).toBe(630)
  expect(png.length).toBeLessThan(600_000)
  expect(new URL(imageUrl).searchParams.get('v')).toBe(
    createHash('sha256').update(png).digest('hex').slice(0, 12),
  )
  expect(html).toContain('창작은 자유롭게. 감상은 즐겁게.')
  const legacy = await request.get('/opengraph-image', { maxRedirects: 0 })
  expect(legacy.status()).toBe(308)
  expect(legacy.headers().location).toBe('/opengraph-image.png')
})

for (const width of [390, 1440]) {
  test(`FAQ and public navigation work at ${String(width)}px`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
      viewport: { width, height: 900 },
    })
    const page = await context.newPage()
    await page.goto(baseURL ?? '/', { waitUntil: 'domcontentloaded' })
    const faq = page.locator('.guest-faq')
    await faq.getByText('ilog는 어떤 서비스인가요?').click()
    await expect(faq.locator('details').first()).toHaveAttribute('open', '')
    await expect(faq.locator('details').first().locator('p')).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await expect(
      faq.getByRole('link', { name: '작품 둘러보기' }),
    ).toHaveAttribute('href', '/works')
    await context.close()
  })
}
