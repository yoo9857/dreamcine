import { describe, expect, it } from 'vitest'

import { LIMITS } from '../limits.js'
import { parsePagination } from './pagination.schema.js'

describe('parsePagination', () => {
  it('uses the default limit when the query omits it', () => {
    expect(parsePagination({})).toEqual({ limit: 20 })
  })

  it('coerces a query-string limit and preserves a cursor', () => {
    expect(parsePagination({ limit: '50', cursor: 'signed-cursor' })).toEqual({
      limit: 50,
      cursor: 'signed-cursor',
    })
  })

  it.each([0, LIMITS.FEED_PAGE_MAX + 1, 1.5, 'not-a-number'])(
    'rejects an invalid limit: %s',
    (limit) => {
      expect(() => parsePagination({ limit })).toThrow()
    },
  )

  it('rejects an empty cursor', () => {
    expect(() => parsePagination({ cursor: '' })).toThrow()
  })
})
