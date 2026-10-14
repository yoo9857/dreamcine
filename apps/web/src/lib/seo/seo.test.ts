import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import robots from '@/app/robots'
import sitemap from '@/app/sitemap'
import { absoluteUrl, absoluteUrlOrNull, siteOrigin } from '@/src/lib/site-url'

import { isNonIndexablePath } from './indexing'
import {
  DEFAULT_OG_IMAGE,
  homeMetadata,
  publicPageMetadata,
  siteJsonLd,
} from './site'

const queries = vi.hoisted(() => ({
  listSitemapEpisodes: vi.fn(),
  listSitemapSeries: vi.fn(),
  listSitemapCreators: vi.fn(),
  listSitemapTags: vi.fn(),
}))
vi.mock('@aidream/db', () => queries)
vi.mock('next/cache', () => ({ unstable_cache: (query: unknown) => query }))
vi.mock('next/server', () => ({ connection: () => Promise.resolve() }))

beforeEach(() => {
  vi.stubEnv('APP_URL', 'https://ilog.info/')
  for (const query of Object.values(queries)) query.mockResolvedValue([])
})
afterEach(() => vi.unstubAllEnvs())

describe('public discovery contracts', () => {
  it('uses one origin for canonical URLs, social cards, brand identity and sitemap', async () => {
    expect(siteOrigin()).toBe('https://ilog.info')
    expect(homeMetadata().alternates?.canonical).toBe('https://ilog.info/')
    expect(homeMetadata().openGraph).toMatchObject({
      url: 'https://ilog.info/',
    })
    expect(siteJsonLd()).toMatchObject({
      '@graph': [
        { '@id': 'https://ilog.info/#organization', url: 'https://ilog.info/' },
        {
          '@id': 'https://ilog.info/#website',
          publisher: { '@id': 'https://ilog.info/#organization' },
        },
      ],
    })
    expect(robots().sitemap).toBe('https://ilog.info/sitemap.xml')
    const updated = new Date('2026-10-01T00:00:00Z')
    queries.listSitemapEpisodes.mockResolvedValue([
      { path: '/watch/public', lastModified: updated },
    ])
    const entries = await sitemap()
    expect(entries).toContainEqual(
      expect.objectContaining({
        url: 'https://ilog.info/watch/public',
        lastModified: updated,
      }),
    )
    expect(entries.some((entry) => entry.url.includes('/browse'))).toBe(false)
    expect(
      entries.find((entry) => entry.url === 'https://ilog.info/')?.lastModified,
    ).toBeUndefined()
  })

  it('keeps static discovery available when the database is unavailable', async () => {
    for (const query of Object.values(queries))
      query.mockRejectedValue(new Error('offline'))
    expect(await sitemap()).toContainEqual(
      expect.objectContaining({ url: 'https://ilog.info/works' }),
    )
  })

  it.each([
    '',
    'not a URL',
    'javascript:alert(1)',
    'https://ilog.info/path',
    'https://user:secret@ilog.info',
    'https://ilog.info/?preview=1',
  ])('does not publish invalid origins: %s', async (origin) => {
    vi.stubEnv('APP_URL', origin)
    try {
      siteOrigin()
      expect.unreachable('invalid origin must be rejected')
    } catch (error) {
      expect(error).toMatchObject({ code: 'E_INTERNAL' })
    }
    expect(absoluteUrlOrNull('/')).toBeNull()
    expect(siteJsonLd()).toBeNull()
    expect(await sitemap()).toEqual([])
  })

  it('rejects external canonical paths', () => {
    expect(() => absoluteUrl('//other.example/page')).toThrow()
    expect(absoluteUrl('/tags/AI 영화')).toBe(
      'https://ilog.info/tags/AI%20%EC%98%81%ED%99%94',
    )
  })

  it('gives public pages their own matching social copy and a default image', () => {
    const meta = publicPageMetadata({
      title: '작품',
      description: '공개 작품 목록',
      path: '/works',
    })
    expect(meta.alternates?.canonical).toBe('https://ilog.info/works')
    expect(meta.openGraph).toMatchObject({
      title: '작품 | ilog',
      description: '공개 작품 목록',
      images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630 }],
    })
    expect(meta.twitter).toMatchObject({
      title: '작품 | ilog',
      description: '공개 작품 목록',
    })
  })

  it('versions the social image so an approved replacement gets a new preview URL', () => {
    expect(DEFAULT_OG_IMAGE).toMatch(
      /^\/opengraph-image\.png\?v=[a-f0-9]{12}$/u,
    )
  })

  it('recovers published URLs on the next request after a query failure', async () => {
    queries.listSitemapEpisodes.mockRejectedValueOnce(new Error('offline'))
    expect(
      (await sitemap()).some((entry) => entry.url.endsWith('/watch/recovered')),
    ).toBe(false)
    queries.listSitemapEpisodes.mockResolvedValue([
      { path: '/watch/recovered' },
    ])
    expect(await sitemap()).toContainEqual(
      expect.objectContaining({ url: 'https://ilog.info/watch/recovered' }),
    )
  })

  it('deduplicates canonical URLs across sitemap sections', async () => {
    queries.listSitemapSeries.mockResolvedValue([{ path: '/works' }])
    expect(
      (await sitemap()).filter(
        (entry) => entry.url === 'https://ilog.info/works',
      ),
    ).toHaveLength(1)
  })

  it.each([
    '/login',
    '/browse',
    '/account',
    '/messages/123',
    '/admin-preview',
    '/studio-preview',
    '/api/feed',
    '/search',
  ])('excludes utility and private routes: %s', (path) => {
    expect(isNonIndexablePath(path)).toBe(true)
  })
  it.each([
    '/',
    '/works',
    '/creators',
    '/watch/123',
    '/u/studio',
    '/about',
    '/ads-plan',
  ])('keeps public content discoverable: %s', (path) => {
    expect(isNonIndexablePath(path)).toBe(false)
  })
})
