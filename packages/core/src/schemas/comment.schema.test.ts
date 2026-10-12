import { describe, expect, it } from 'vitest'

import {
  CommentListQuerySchema,
  CreateCommentSchema,
} from './comment.schema.js'

describe('CreateCommentSchema', () => {
  it('accepts optional reply pagination without changing the default thread query', () => {
    expect(
      CommentListQuerySchema.parse({ limit: '20', parentId: 'root' }),
    ).toMatchObject({ limit: 20, parentId: 'root' })
    expect(CommentListQuerySchema.safeParse({ parentId: '' }).success).toBe(
      false,
    )
    expect(CommentListQuerySchema.parse({})).not.toHaveProperty('parentId')
  })
  it('accepts one reply level input', () => {
    expect(
      CreateCommentSchema.parse({ body: '답글', parentId: 'comment_1' }),
    ).toEqual({ body: '답글', parentId: 'comment_1' })
  })

  it('rejects bodies over 1000 characters', () => {
    expect(() =>
      CreateCommentSchema.parse({ body: '가'.repeat(1001) }),
    ).toThrow()
  })
})
