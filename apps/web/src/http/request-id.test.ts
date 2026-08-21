import { describe, expect, it } from 'vitest'

import { REQUEST_ID_LENGTH, createRequestId } from './request-id'

const CROCKFORD = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]+$/u

describe('createRequestId', () => {
  it('26자 ULID 를 만든다', () => {
    expect(createRequestId()).toHaveLength(REQUEST_ID_LENGTH)
    expect(REQUEST_ID_LENGTH).toBe(26)
  })

  it('Crockford base32 문자만 쓴다 (I, L, O, U 제외)', () => {
    for (let index = 0; index < 50; index += 1) {
      expect(createRequestId()).toMatch(CROCKFORD)
    }
  })

  it('시간이 흐르면 사전순으로 커진다', () => {
    const earlier = createRequestId(1_600_000_000_000)
    const later = createRequestId(1_600_000_001_000)
    expect(earlier < later).toBe(true)
  })

  it('같은 시각이어도 서로 다르다', () => {
    const ids = new Set(
      Array.from({ length: 200 }, () => createRequestId(1_600_000_000_000)),
    )
    expect(ids.size).toBe(200)
  })

  it('같은 시각이면 앞 10자가 같다', () => {
    const first = createRequestId(1_600_000_000_000).slice(0, 10)
    const second = createRequestId(1_600_000_000_000).slice(0, 10)
    expect(first).toBe(second)
  })
})
