// @vitest-environment jsdom

import type { CommentThreadItem } from '@aidream/core'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it } from 'vitest'

import { CommentThread } from './CommentThread'

const item: CommentThreadItem = {
  id: 'comment_1',
  episodeId: 'episode_1',
  body: '삭제된 댓글입니다.',
  parentId: null,
  createdAt: '2026-08-25T00:00:00.000Z',
  updatedAt: '2026-08-25T00:00:00.000Z',
  deleted: true,
  user: {
    handle: 'creator',
    displayName: '제작자',
    avatarUrl: null,
    tier: 'BRONZE',
    isVerified: false,
  },
  replies: [
    {
      id: 'comment_2',
      episodeId: 'episode_1',
      body: '남아 있는 답글',
      parentId: 'comment_1',
      createdAt: '2026-08-25T00:01:00.000Z',
      updatedAt: '2026-08-25T00:01:00.000Z',
      deleted: false,
      user: {
        handle: 'viewer',
        displayName: '시청자',
        avatarUrl: null,
        tier: 'BRONZE',
        isVerified: false,
      },
    },
  ],
}

describe('CommentThread', () => {
  it('renders deleted parents, active replies, and a signed-out composer state', () => {
    render(
      <CommentThread
        episodeId="episode_1"
        initialItems={[item]}
        authenticated={false}
      />,
    )
    expect(screen.getByText('삭제된 댓글입니다.')).toBeTruthy()
    expect(screen.getByText('남아 있는 답글')).toBeTruthy()
    expect(
      screen.getByText('로그인하면 댓글을 작성할 수 있습니다.'),
    ).toBeTruthy()
  })

  it('renders the honest empty state', () => {
    render(
      <CommentThread episodeId="episode_1" initialItems={[]} authenticated />,
    )
    expect(screen.getByText('첫 댓글을 남겨 보세요.')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: '댓글 내용' })).toBeTruthy()
  })
})
