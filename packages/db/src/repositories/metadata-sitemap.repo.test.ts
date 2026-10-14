import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const queries = vi.hoisted(() => ({
  series: vi.fn(),
  episode: vi.fn(),
  tag: vi.fn(),
}))
vi.mock('../client.js', () => ({
  db: {
    series: { findMany: queries.series },
    episode: { findMany: queries.episode },
    tag: { findMany: queries.tag },
  },
}))

import {
  listSitemapEpisodes,
  listSitemapSeries,
  listSitemapTags,
} from './metadata.repo.js'
import { listEpisodesBySeries } from './episode.repo.js'

const publishedBefore = new Date('2026-10-14T00:00:00Z')
beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(publishedBefore)
  for (const query of Object.values(queries))
    query.mockReset().mockResolvedValue([])
})
afterEach(() => vi.useRealTimers())

describe('sitemap publication boundaries', () => {
  it('uses only public episodes already released when preparing series metadata', async () => {
    await listEpisodesBySeries({
      seriesId: 'series',
      status: ['PUBLISHED'],
      publicOnly: true,
      limit: 1,
    })
    expect(queries.episode).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          seriesId: 'series',
          deletedAt: null,
          visibility: 'PUBLIC',
          publishedAt: { lte: publishedBefore },
          status: { in: ['PUBLISHED'] },
        },
      }),
    )
  })
  it('requires an actually published public episode before listing a series', async () => {
    await listSitemapSeries(10)
    expect(queries.series).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          visibility: 'PUBLIC',
          episodes: {
            some: {
              status: 'PUBLISHED',
              visibility: 'PUBLIC',
              deletedAt: null,
              publishedAt: { lte: publishedBefore },
            },
          },
        },
      }),
    )
  })
  it('excludes private episodes and private or deleted parent series', async () => {
    await listSitemapEpisodes(10)
    expect(queries.episode).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          deletedAt: null,
          publishedAt: { lte: publishedBefore },
          series: { deletedAt: null, visibility: 'PUBLIC' },
        },
      }),
    )
  })
  it('does not fabricate modification dates for tags', async () => {
    queries.tag.mockResolvedValue([{ name: 'AI 영화' }])
    expect(await listSitemapTags(10)).toEqual([
      { path: '/tags/AI%20%EC%98%81%ED%99%94' },
    ])
  })
})
