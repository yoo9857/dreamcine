import { beforeEach, describe, expect, it, vi } from 'vitest'

interface Row {
  category: { nameKo: string } | null
  credits: { name: string }[]
  series: { category: { nameKo: string } | null; credits: { name: string }[] }
}
const query = vi.hoisted(() =>
  vi.fn<(options: unknown) => Promise<Row | null>>(),
)
vi.mock('../client.js', () => ({ db: { episode: { findFirst: query } } }))
import { findEpisodeProductionInfo } from './metadata.repo.js'

beforeEach(() => {
  query.mockReset()
})
describe('watch production metadata', () => {
  it('uses episode genre and directors before series metadata', async () => {
    query.mockResolvedValue({
      category: { nameKo: '애니메이션' },
      credits: [{ name: ' 조차분 ' }, { name: '조차분' }],
      series: {
        category: { nameKo: '드라마' },
        credits: [{ name: '시리즈 감독' }],
      },
    })
    expect(await findEpisodeProductionInfo('episode')).toEqual({
      genre: '애니메이션',
      directors: ['조차분'],
    })
    expect(query.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'episode', deletedAt: null },
      select: {
        credits: { where: { role: 'DIRECTOR' } },
        series: { select: { credits: { where: { role: 'DIRECTOR' } } } },
      },
    })
  })
  it('falls back to registered series genre and directors', async () => {
    query.mockResolvedValue({
      category: null,
      credits: [],
      series: {
        category: { nameKo: '드라마' },
        credits: [{ name: '시리즈 감독' }],
      },
    })
    expect(await findEpisodeProductionInfo('episode')).toEqual({
      genre: '드라마',
      directors: ['시리즈 감독'],
    })
  })
  it('does not invent missing genre or director information', async () => {
    query.mockResolvedValue({
      category: null,
      credits: [],
      series: { category: null, credits: [] },
    })
    expect(await findEpisodeProductionInfo('episode')).toEqual({
      genre: null,
      directors: [],
    })
    query.mockResolvedValue(null)
    expect(await findEpisodeProductionInfo('missing')).toBeNull()
  })
})
