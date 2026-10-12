import type { Prisma } from '@prisma/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

const findMany = vi.hoisted(() =>
  vi.fn<(query: Prisma.CommentFindManyArgs) => Promise<unknown[]>>(),
)
vi.mock('../client.js', () => ({ db: { comment: { findMany } } }))

import { decodeCursor, encodeCursor } from '../cursor.js'
import { listCommentThreadsByEpisode } from './social.repo.js'

afterEach(() => {
  vi.unstubAllEnvs()
  findMany.mockReset()
})

describe('comment thread visibility and cursors', () => {
  it('omits hidden threads and does not retain deleted roots for hidden-only replies', async () => {
    findMany.mockResolvedValue([])
    await listCommentThreadsByEpisode({ episodeId: 'ep', limit: 20 })
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        episodeId: 'ep',
        parentId: null,
        isHidden: false,
        episode: {
          status: 'PUBLISHED',
          deletedAt: null,
          series: { deletedAt: null },
        },
        OR: [
          { deletedAt: null },
          { replies: { some: { deletedAt: null, isHidden: false } } },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
  })

  it('returns an ascending signed reply cursor and advances after the last reply', async () => {
    vi.stubEnv('AUTH_SECRET', 'comment-test-secret-at-least-32-characters')
    const createdAt = new Date('2026-10-12T00:00:00.000Z')
    findMany.mockResolvedValue([
      { id: 'r1', createdAt },
      { id: 'r2', createdAt },
      { id: 'r3', createdAt },
    ])
    const first = await listCommentThreadsByEpisode({
      episodeId: 'ep',
      parentId: 'root',
      limit: 2,
    })
    expect(first.items.map((row) => row.id)).toEqual(['r1', 'r2'])
    if (first.nextCursor === null) throw new Error('expected next reply cursor')
    expect(decodeCursor(first.nextCursor)).toEqual({
      k: createdAt.toISOString(),
      id: 'r2',
    })
    findMany.mockResolvedValue([])
    await listCommentThreadsByEpisode({
      episodeId: 'ep',
      parentId: 'root',
      limit: 2,
      cursor: first.nextCursor,
    })
    expect(findMany.mock.calls[1]?.[0]).toMatchObject({
      where: {
        parentId: 'root',
        parent: { episodeId: 'ep', isHidden: false },
        AND: {
          OR: [
            { createdAt: { gt: createdAt } },
            { createdAt, id: { gt: 'r2' } },
          ],
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      take: 3,
    })
  })

  it('keeps top-level cursors descending and rejects tampered cursors before querying', async () => {
    vi.stubEnv('AUTH_SECRET', 'comment-test-secret-at-least-32-characters')
    const createdAt = new Date('2026-10-12T00:00:00.000Z')
    findMany.mockResolvedValue([])
    await listCommentThreadsByEpisode({
      episodeId: 'ep',
      limit: 20,
      cursor: encodeCursor({ k: createdAt.toISOString(), id: 'root' }),
    })
    expect(findMany.mock.calls[0]?.[0]).toMatchObject({
      where: {
        AND: {
          OR: [
            { createdAt: { lt: createdAt } },
            { createdAt, id: { lt: 'root' } },
          ],
        },
      },
    })
    findMany.mockClear()
    await expect(
      listCommentThreadsByEpisode({
        episodeId: 'ep',
        limit: 20,
        cursor: 'tampered.cursor',
      }),
    ).rejects.toMatchObject({ code: 'E_FEED_INVALID_CURSOR' })
    expect(findMany).not.toHaveBeenCalled()
  })
})
