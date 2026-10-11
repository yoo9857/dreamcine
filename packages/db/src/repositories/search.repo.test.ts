import { Prisma } from '@prisma/client'
import { describe, expect, it, vi } from 'vitest'

const query = vi.hoisted(() => vi.fn<(sql: Prisma.Sql) => Promise<unknown[]>>())
vi.mock('../client.js', () => ({ db: { $queryRaw: query } }))

import { searchCatalog } from './search.repo.js'

describe('series search creator metadata', () => {
  it('selects tier and verification alongside the creator fields required by public results', async () => {
    query.mockResolvedValue([])
    await searchCatalog('series', 'fire', { limit: 20 })
    const sql = query.mock.calls[0]?.[0].sql
    expect(sql).toContain('creator.tier AS "creatorTier"')
    expect(sql).toContain('creator.verified_at AS "creatorVerifiedAt"')
  })
})
