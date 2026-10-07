import { RESERVED_HANDLES, SearchResultSchema } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import {
  HIGGSFIELD_FILMS,
  higgsfieldFilmBySlug,
  higgsfieldProfile,
  higgsfieldSearchResults,
  higgsfieldSeriesList,
  higgsfieldWatchPath,
  higgsfieldWorkCard,
  isHiggsfieldHandle,
} from './higgsfield'

describe('higgsfield profile', () => {
  it('keeps one watch page and one profile card per film', () => {
    const slugs = HIGGSFIELD_FILMS.map((film) => film.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(higgsfieldProfile().handle).toBe('higgsfield')
    expect(higgsfieldProfile().seriesCount).toBe(HIGGSFIELD_FILMS.length)
    expect(isHiggsfieldHandle('Higgsfield')).toBe(true)

    for (const film of HIGGSFIELD_FILMS) {
      const series = higgsfieldSeriesList().find(
        (item) => item.slug === film.slug,
      )
      expect(series).toBeTruthy()
      const card = higgsfieldWorkCard(series?.id ?? '')
      expect(card?.href).toBe(higgsfieldWatchPath(film.slug))
      expect(card?.meta.includes(film.credit)).toBe(true)
      expect(higgsfieldFilmBySlug(film.slug)?.title).toBe(film.title)
    }
    expect(higgsfieldFilmBySlug('missing')).toBeUndefined()
    expect(higgsfieldWorkCard('series-1')).toBeNull()
  })

  it('reserves the handle and stays searchable without a catalog row', () => {
    expect(RESERVED_HANDLES).toContain('higgsfield')

    const episodes = higgsfieldSearchResults('episode', 'THREAD')
    const series = higgsfieldSearchResults('series', 'pandaproduction')
    const users = higgsfieldSearchResults('user', 'Higgsfield')
    expect(
      episodes.map((item) =>
        item.type === 'episode' ? item.episode.title : '',
      ),
    ).toEqual(['THREAD'])
    expect(
      series.map((item) => (item.type === 'series' ? item.slug : '')),
    ).toEqual(['thread'])
    expect(users).toEqual([
      {
        type: 'user',
        handle: 'higgsfield',
        displayName: 'Higgsfield',
        avatarUrl: null,
        followerCount: 0,
      },
    ])
    for (const result of [...episodes, ...series, ...users]) {
      expect(SearchResultSchema.safeParse(result).success).toBe(true)
    }
    expect(higgsfieldSearchResults('episode', '없는작품')).toEqual([])
  })
})
