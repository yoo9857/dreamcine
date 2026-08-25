import { describe, expect, it, vi } from 'vitest'

import { listComments, type ListCommentsDependencies } from './list-comments'

const now = new Date('2026-08-25T00:00:00.000Z')

describe('listComments', () => {
  it('keeps replies under a deleted parent and renders the placeholder', async () => {
    const deps: ListCommentsDependencies = {
      list: vi.fn().mockResolvedValue({
        items: [
          {
            id: 'root',
            episodeId: 'ep',
            parentId: null,
            body: 'secret',
            createdAt: now,
            updatedAt: now,
            deletedAt: now,
            user: { handle: 'author', displayName: 'Author', avatarKey: null },
            replies: [
              {
                id: 'reply',
                episodeId: 'ep',
                parentId: 'root',
                body: 'reply',
                createdAt: now,
                updatedAt: now,
                deletedAt: null,
                user: {
                  handle: 'reply',
                  displayName: 'Reply',
                  avatarKey: null,
                },
              },
            ],
          },
        ],
        nextCursor: null,
      }),
    }
    await expect(
      listComments('ep', { limit: 20 }, deps),
    ).resolves.toMatchObject({
      items: [
        {
          body: '삭제된 댓글입니다',
          deleted: true,
          replies: [{ id: 'reply', body: 'reply' }],
        },
      ],
    })
  })

  it('passes the signed cursor to the repository', async () => {
    const deps: ListCommentsDependencies = {
      list: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    }
    await listComments('ep', { limit: 10, cursor: 'cursor' }, deps)
    expect(deps.list).toHaveBeenCalledWith({
      episodeId: 'ep',
      limit: 10,
      cursor: 'cursor',
    })
  })
})
