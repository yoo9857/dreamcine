import type { Comment, User } from '@aidream/core'
import { describe, expect, it, vi } from 'vitest'

import type { RouteSession } from '@/src/auth/types'
import { createComment, type CreateCommentDependencies } from './create-comment'
import { followUser, type FollowUserDependencies } from './follow-user'
import { addLike, type ToggleLikeDependencies } from './toggle-like'

const now = new Date('2026-08-25T00:00:00.000Z')
const session = {
  userId: 'viewer',
  user: {
    id: 'viewer',
    handle: 'viewer',
    email: 'viewer@example.com',
    displayName: 'Viewer',
    role: 'VIEWER',
    status: 'ACTIVE',
    emailVerified: true,
  },
  expiresAt: now,
} satisfies RouteSession
const creator = {
  id: 'creator',
  handle: 'creator',
  email: 'creator@example.com',
  emailVerified: now,
  passwordHash: null,
  displayName: 'Creator',
  bio: null,
  avatarKey: null,
  role: 'CREATOR',
  status: 'ACTIVE',
  followerCount: 3,
  seriesCount: 1,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
} satisfies User
const viewer = {
  ...creator,
  id: 'viewer',
  handle: 'viewer',
  email: 'viewer@example.com',
  displayName: 'Viewer',
  role: 'VIEWER',
} satisfies User
const comment = {
  id: 'comment',
  episodeId: 'episode',
  userId: 'viewer',
  parentId: null,
  body: 'comment',
  isHidden: false,
  createdAt: now,
  updatedAt: now,
  deletedAt: null,
} satisfies Comment

function followDependencies(blocked = false): FollowUserDependencies {
  return {
    findTarget: vi.fn().mockResolvedValue(creator),
    blocked: vi.fn().mockResolvedValue(blocked),
    follow: vi.fn().mockResolvedValue({ created: true, followerCount: 4 }),
    notify: vi.fn().mockRejectedValue(new Error('notification unavailable')),
  }
}

function likeDependencies(blocked = false): ToggleLikeDependencies {
  return {
    findEpisode: vi.fn().mockResolvedValue({
      id: 'episode',
      ownerId: 'creator',
      status: 'PUBLISHED',
      ageRating: 'ALL',
      asset: null,
    }),
    blocked: vi.fn().mockResolvedValue(blocked),
    add: vi.fn().mockResolvedValue({ created: true, likeCount: 1 }),
    remove: vi.fn().mockResolvedValue({ removed: false, likeCount: 1 }),
    notify: vi.fn().mockRejectedValue(new Error('notification unavailable')),
  }
}

function commentDependencies(blocked = false): CreateCommentDependencies {
  return {
    findEpisode: vi.fn().mockResolvedValue({
      id: 'episode',
      ownerId: 'creator',
      status: 'PUBLISHED',
      commentsOff: false,
    }),
    findParent: vi.fn().mockResolvedValue(null),
    findUser: vi.fn().mockResolvedValue(viewer),
    blocked: vi.fn().mockResolvedValue(blocked),
    insert: vi.fn().mockResolvedValue(comment),
    notify: vi.fn().mockRejectedValue(new Error('notification unavailable')),
  }
}

describe('T10 social service integration', () => {
  it('keeps completed mutations successful when notification delivery fails', async () => {
    const follow = followDependencies()
    const like = likeDependencies()
    const create = commentDependencies()

    await expect(followUser(session, 'creator', follow)).resolves.toEqual({
      followerCount: 4,
    })
    await expect(addLike(session, 'episode', like)).resolves.toEqual({
      liked: true,
      likeCount: 1,
    })
    await expect(
      createComment(session, 'episode', { body: 'comment' }, create),
    ).resolves.toMatchObject({ id: 'comment' })
    expect(follow.follow).toHaveBeenCalledOnce()
    expect(like.add).toHaveBeenCalledOnce()
    expect(create.insert).toHaveBeenCalledOnce()
  })

  it('rejects blocked interactions before any social mutation', async () => {
    const follow = followDependencies(true)
    const like = likeDependencies(true)
    const create = commentDependencies(true)

    await expect(followUser(session, 'creator', follow)).rejects.toMatchObject({
      code: 'E_SOCIAL_BLOCKED',
    })
    await expect(addLike(session, 'episode', like)).rejects.toMatchObject({
      code: 'E_SOCIAL_BLOCKED',
    })
    await expect(
      createComment(session, 'episode', { body: 'comment' }, create),
    ).rejects.toMatchObject({ code: 'E_SOCIAL_BLOCKED' })
    expect(follow.follow).not.toHaveBeenCalled()
    expect(like.add).not.toHaveBeenCalled()
    expect(create.insert).not.toHaveBeenCalled()
  })
})
