import type { Comment, User } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import { deleteComment, type DeleteCommentDependencies } from './delete-comment'
import { updateComment, type UpdateCommentDependencies } from './update-comment'

const createdAt = new Date('2026-08-25T00:00:00.000Z')
const session = {
  userId: 'viewer',
  user: {
    id: 'viewer',
    handle: 'viewer',
    email: 'v@example.com',
    displayName: 'V',
    role: 'VIEWER',
    status: 'ACTIVE',
    emailVerified: true,
  },
  expiresAt: createdAt,
} satisfies RouteSession
const comment = {
  id: 'comment',
  episodeId: 'ep',
  userId: 'viewer',
  parentId: null,
  body: 'old',
  isHidden: false,
  createdAt,
  updatedAt: createdAt,
  deletedAt: null,
} satisfies Comment
const user = {
  id: 'viewer',
  handle: 'viewer',
  email: 'v@example.com',
  emailVerified: createdAt,
  passwordHash: null,
  displayName: 'Viewer',
  bio: null,
  avatarKey: null,
  role: 'VIEWER',
  status: 'ACTIVE',
  followerCount: 0,
  seriesCount: 0,
  createdAt,
  updatedAt: createdAt,
  deletedAt: null,
} satisfies User

describe('comment mutations', () => {
  it('updates an owned comment inside the 15 minute window', async () => {
    const deps: UpdateCommentDependencies = {
      findComment: vi.fn().mockResolvedValue(comment),
      findUser: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue({ ...comment, body: 'new' }),
      now: () => new Date(createdAt.getTime() + 14 * 60 * 1000),
    }
    await expect(
      updateComment(session, 'comment', { body: ' new ' }, deps),
    ).resolves.toMatchObject({ body: 'new' })
  })

  it('rejects an edit after 15 minutes', async () => {
    const deps: UpdateCommentDependencies = {
      findComment: vi.fn().mockResolvedValue(comment),
      findUser: vi.fn(),
      update: vi.fn(),
      now: () => new Date(createdAt.getTime() + 16 * 60 * 1000),
    }
    await expect(
      updateComment(session, 'comment', { body: 'new' }, deps),
    ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
  })

  it('allows the owner or moderator to soft-delete and rejects strangers', async () => {
    const owner: DeleteCommentDependencies = {
      findComment: vi.fn().mockResolvedValue(comment),
      remove: vi.fn().mockResolvedValue(comment),
    }
    await deleteComment(session, 'comment', owner)
    expect(owner.remove).toHaveBeenCalledOnce()

    const stranger: DeleteCommentDependencies = {
      findComment: vi.fn().mockResolvedValue(comment),
      remove: vi.fn(),
    }
    await expect(
      deleteComment(
        { ...session, userId: 'other', user: { ...session.user, id: 'other' } },
        'comment',
        stranger,
      ),
    ).rejects.toMatchObject({ code: 'E_PERM_NOT_OWNER' })
  })
})
