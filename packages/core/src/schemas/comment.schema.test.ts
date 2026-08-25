import { describe, expect, it } from 'vitest'

import { CreateCommentSchema } from './comment.schema.js'

describe('CreateCommentSchema', () => {
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
