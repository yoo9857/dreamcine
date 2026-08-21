import { describe, expect, it } from 'vitest'

import { accepted, created, noContent, ok, paginated } from './response'

describe('response builders', () => {
  it('ok 는 200 이다', () => {
    expect(ok({ a: 1 })).toEqual({ status: 200, body: { a: 1 } })
  })

  it('created 는 201 이다', () => {
    expect(created({ id: 'x' })).toEqual({ status: 201, body: { id: 'x' } })
  })

  it('accepted 는 202 다', () => {
    expect(accepted({ id: 'x' })).toEqual({ status: 202, body: { id: 'x' } })
  })

  it('noContent 는 204 이고 body 가 없다', () => {
    expect(noContent()).toEqual({ status: 204 })
    expect(noContent().body).toBeUndefined()
  })

  it('paginated 는 items 와 nextCursor 를 담는다', () => {
    expect(paginated([1, 2], 'cursor')).toEqual({
      status: 200,
      body: { items: [1, 2], nextCursor: 'cursor' },
    })
  })

  it('마지막 페이지의 nextCursor 는 null 이다', () => {
    expect(paginated([], null).body).toEqual({ items: [], nextCursor: null })
  })
})
