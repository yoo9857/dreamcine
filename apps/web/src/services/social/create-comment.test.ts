import type { Comment, User } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import { createComment, type CreateCommentDependencies } from './create-comment'
import { userFixture } from '@/src/test-support/entity-fixtures'

const now = new Date('2026-08-25T00:00:00.000Z')
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
    tier: 'BRONZE',
    isVerified: false,
  },
  expiresAt: now,
} satisfies RouteSession
const user = {
  ...userFixture(),
  id: 'viewer',
  handle: 'viewer',
  email: 'v@example.com',
  emailVerified: now,
  passwordHash: null,
  displayName: 'Viewer',
  bio: null,
  avatarKey: null,
  role: 'VIEWER',
  status: 'ACTIVE',
  followerCount: 0,
  seriesCount: 0,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
} satisfies User
const comment = {
  id: 'comment',
  episodeId: 'ep',
  userId: 'viewer',
  parentId: null,
  body: '좋아요',
  isHidden: false,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
} satisfies Comment

function dependencies(): CreateCommentDependencies {
  return {
    findEpisode: vi.fn().mockResolvedValue({
      id: 'ep',
      ownerId: 'creator',
      status: 'PUBLISHED',
      commentsOff: false,
    }),
    findParent: vi.fn().mockResolvedValue(null),
    findUser: vi.fn().mockResolvedValue(user),
    blocked: vi.fn().mockResolvedValue(false),
    insert: vi.fn().mockResolvedValue(comment),
    notify: vi.fn().mockResolvedValue(undefined),
  }
}

describe('createComment', () => {
  it('notifies the parent author about replies without duplicating the creator notification', async () => {
    const deps = dependencies()
    vi.mocked(deps.findParent).mockResolvedValue({
      ...comment,
      userId: 'parent-author',
    })
    await createComment(
      session,
      'ep',
      { body: 'reply', parentId: comment.id },
      deps,
    )
    expect(deps.notify).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'parent-author' }),
    )
    expect(deps.notify).toHaveBeenCalledTimes(2)
    vi.mocked(deps.notify).mockClear()
    vi.mocked(deps.findParent).mockResolvedValue({
      ...comment,
      userId: 'creator',
    })
    await createComment(
      session,
      'ep',
      { body: 'reply', parentId: comment.id },
      deps,
    )
    expect(deps.notify).toHaveBeenCalledTimes(1)
  })
  it('does not insert a comment when the session user no longer exists', async () => {
    const deps = dependencies()
    vi.mocked(deps.findUser).mockResolvedValue(null)
    await expect(
      createComment(session, 'ep', { body: 'draft' }, deps),
    ).rejects.toMatchObject({ code: 'E_USER_NOT_FOUND' })
    expect(deps.insert).not.toHaveBeenCalled()
    expect(deps.notify).not.toHaveBeenCalled()
  })

  it('rejects hidden parents and blocked parent authors before inserting', async () => {
    const hidden = dependencies()
    vi.mocked(hidden.findParent).mockResolvedValue({
      ...comment,
      isHidden: true,
    })
    await expect(
      createComment(
        session,
        'ep',
        { body: 'reply', parentId: comment.id },
        hidden,
      ),
    ).rejects.toMatchObject({ code: 'E_COMMENT_NOT_FOUND' })
    expect(hidden.insert).not.toHaveBeenCalled()
    const blocked = dependencies()
    vi.mocked(blocked.findParent).mockResolvedValue({
      ...comment,
      userId: 'parent-author',
    })
    vi.mocked(blocked.blocked)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    await expect(
      createComment(
        session,
        'ep',
        { body: 'reply', parentId: comment.id },
        blocked,
      ),
    ).rejects.toMatchObject({ code: 'E_SOCIAL_BLOCKED' })
    expect(blocked.blocked).toHaveBeenLastCalledWith('viewer', 'parent-author')
    expect(blocked.insert).not.toHaveBeenCalled()
  })
  it('sanitizes, inserts, and returns the public response', async () => {
    const deps = dependencies()
    await expect(
      createComment(session, 'ep', { body: ' 좋\u200B아요 ' }, deps),
    ).resolves.toMatchObject({ id: 'comment', body: '좋아요', deleted: false })
    expect(deps.insert).toHaveBeenCalledWith(
      expect.objectContaining({ body: '좋아요' }),
    )
    expect(deps.notify).toHaveBeenCalledOnce()
  })

  it('rejects replies to replies and disabled comments', async () => {
    const nested = dependencies()
    vi.mocked(nested.findParent).mockResolvedValue({
      ...comment,
      parentId: 'root',
    })
    await expect(
      createComment(
        session,
        'ep',
        { body: 'reply', parentId: 'child' },
        nested,
      ),
    ).rejects.toMatchObject({ code: 'E_COMMENT_DEPTH_EXCEEDED' })

    const disabled = dependencies()
    vi.mocked(disabled.findEpisode).mockResolvedValue({
      id: 'ep',
      ownerId: 'creator',
      status: 'PUBLISHED',
      commentsOff: true,
    })
    await expect(
      createComment(session, 'ep', { body: 'comment' }, disabled),
    ).rejects.toMatchObject({ code: 'E_COMMENT_DISABLED' })
  })
})
