import type { Prisma } from '@prisma/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const queryRaw = vi.hoisted(() =>
  vi.fn<(query: Prisma.Sql) => Promise<unknown[]>>(),
)
vi.mock('../client.js', () => ({ db: { $queryRaw: queryRaw } }))
import {
  listLatestFeed,
  listPopularFeed,
  listFollowingFeed,
} from './feed.repo.js'

afterEach(() => queryRaw.mockReset())
describe('public discovery visibility', () => {
  it.each(['latest', 'popular', 'following'] as const)(
    '%s excludes private and unlisted episodes and series',
    async (type) => {
      queryRaw.mockResolvedValue([])
      if (type === 'following') await listFollowingFeed('viewer', { limit: 20 })
      else
        await (type === 'latest' ? listLatestFeed : listPopularFeed)({
          limit: 20,
        })
      const sql = queryRaw.mock.calls[0]?.[0].sql
      expect(sql).toContain("e.visibility = 'PUBLIC'")
      expect(sql).toContain("s.visibility = 'PUBLIC'")
      expect(sql).toContain('e.deleted_at IS NULL')
      expect(sql).toContain('s.deleted_at IS NULL')
    },
  )
})
