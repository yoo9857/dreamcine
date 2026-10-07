import { describe, expect, it, vi } from 'vitest'

interface Query {
  where: unknown
  select: Record<string, unknown>
  take: number
}
const queries = vi.hoisted(() => ({
  series: vi.fn<(query: Query) => Promise<unknown[]>>(),
  user: vi.fn<(query: Query) => Promise<unknown[]>>(),
}))
vi.mock('../client.js', () => ({
  db: {
    series: { findMany: queries.series },
    user: { findMany: queries.user },
  },
}))

import { lookupHelpCatalog } from './help-catalog.repo.js'

describe('help catalog privacy boundary', () => {
  it('filters drafts, hidden/deleted records and blocked creators before selecting public metadata', async () => {
    queries.series.mockResolvedValue([])
    queries.user.mockResolvedValue([])
    await lookupHelpCatalog('artist', 'viewer')
    expect(queries.series.mock.calls[0]?.[0]).toMatchObject({
      where: {
        deletedAt: null,
        visibility: 'PUBLIC',
        owner: {
          status: 'ACTIVE',
          deletedAt: null,
          profileVisibility: 'PUBLIC',
          blockedBy: { none: { blockerId: 'viewer' } },
        },
        episodes: {
          some: {
            status: 'PUBLISHED',
            visibility: 'PUBLIC',
            deletedAt: null,
            publishedAt: { not: null },
          },
        },
      },
      take: 3,
    })
    expect(queries.user.mock.calls[0]?.[0]).toMatchObject({
      where: {
        status: 'ACTIVE',
        profileVisibility: 'PUBLIC',
        role: { in: ['CREATOR', 'PARTNER'] },
      },
      select: { handle: true, displayName: true, bio: true },
      take: 3,
    })
    const selections =
      JSON.stringify(queries.series.mock.calls[0]?.[0].select) +
      JSON.stringify(queries.user.mock.calls[0]?.[0].select)
    expect(selections).not.toMatch(/email|password|application|follower/)
  })
})
