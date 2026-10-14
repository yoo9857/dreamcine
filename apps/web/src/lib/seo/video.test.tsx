import type { EpisodeMetaView } from '@aidream/core'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { JsonLd } from '@/src/components/seo/JsonLd'

import { buildEpisodeJsonLd, buildEpisodeMetadata } from './episode-metadata'
import { DEFAULT_OG_IMAGE } from './site'

const episode: EpisodeMetaView = {
  episodeId: 'episode',
  seriesId: 'series',
  seriesSlug: 'series',
  seriesTitle: '시리즈',
  status: 'PUBLISHED',
  seriesVisibility: 'PUBLIC',
  seriesDeletedAt: null,
  number: 1,
  title: '첫 회',
  description: '작품 소개',
  metaTitle: null,
  metaDescription: null,
  canonicalPath: null,
  thumbKey: null,
  ogImageKey: null,
  durationSec: 120,
  language: 'ko',
  ageRating: 'ALL',
  visibility: 'PUBLIC',
  madeForKids: false,
  license: 'STANDARD',
  allowEmbed: false,
  keywords: [],
  contentWarnings: [],
  regionsAllowed: [],
  regionsBlocked: [],
  aiDisclosure: null,
  aiModels: [],
  aiTools: [],
  aiHumanRole: null,
  category: null,
  chapters: [],
  credits: [],
  subtitles: [],
  translations: [],
  creator: {
    handle: 'creator',
    displayName: '작가',
    avatarUrl: null,
    tier: 'BRONZE',
    isVerified: false,
  },
  publishedAt: new Date('2026-10-01T00:00:00Z'),
  viewCount: '10',
  likeCount: 2,
  commentCount: 1,
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('video discovery accuracy', () => {
  it('does not advertise translation URLs without a translated page', () => {
    vi.stubEnv('APP_URL', 'https://ilog.info')
    const meta = buildEpisodeMetadata(episode, { isPubliclyVisible: true })
    expect(meta.alternates?.languages).toBeUndefined()
    expect(meta.openGraph).toMatchObject({
      images: [{ url: `https://ilog.info${DEFAULT_OG_IMAGE}` }],
    })
    expect(meta.robots).toMatchObject({
      googleBot: { 'max-video-preview': -1, 'max-snippet': -1 },
    })
  })
  it('does not confuse a general audience film with a film made for children', () => {
    const [general] = buildEpisodeJsonLd(episode)
    const [adult] = buildEpisodeJsonLd({ ...episode, ageRating: 'A19' })
    expect(general?.isFamilyFriendly).toBe(true)
    expect(adult?.isFamilyFriendly).toBe(false)
  })
  it('does not fabricate video thumbnails or publication dates', () => {
    const [video] = buildEpisodeJsonLd(episode)
    expect(video?.thumbnailUrl).toBeUndefined()
    expect(buildEpisodeJsonLd({ ...episode, publishedAt: null })).toEqual([])
  })
  it.each([
    { status: 'DRAFT' as const },
    { status: 'HIDDEN' as const },
    { visibility: 'UNLISTED' as const },
    { seriesVisibility: 'PRIVATE' as const },
    { seriesDeletedAt: new Date() },
    { publishedAt: new Date('2099-01-01T00:00:00Z') },
  ])(
    'keeps unavailable publication states out of metadata and structured data: %j',
    (patch) => {
      const candidate = { ...episode, ...patch }
      expect(
        buildEpisodeMetadata(candidate, { isPubliclyVisible: true }).robots,
      ).toMatchObject({ index: false })
      expect(buildEpisodeJsonLd(candidate)).toEqual([])
    },
  )
  it('does not advertise an embed endpoint that does not exist', () => {
    const [video] = buildEpisodeJsonLd({ ...episode, allowEmbed: true })
    expect(video?.embedUrl).toBeUndefined()
  })
  it('excludes non-public content from indexing', () => {
    expect(
      buildEpisodeMetadata(episode, { isPubliclyVisible: false }).robots,
    ).toMatchObject({ index: false, follow: false })
  })
  it('escapes creator text that could close a JSON-LD script element', () => {
    vi.stubGlobal('React', React)
    const html = renderToStaticMarkup(
      <JsonLd document={{ name: '</script><script>alert(1)</script>' }} />,
    )
    expect(html.match(/<script/gu)).toHaveLength(1)
    expect(html).toContain('\\u003c/script>')
  })
})
