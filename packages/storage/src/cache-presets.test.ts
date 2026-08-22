import { describe, expect, it } from 'vitest'

import { IMMUTABLE_1Y, NO_STORE } from './cache-presets.js'

describe('cache-presets', () => {
  it('IMMUTABLE_1Y 는 1년 + immutable 이다', () => {
    // 06_MEDIA_PIPELINE §1 의 불변성 철칙 — 같은 키에 다른 내용을 쓰지 않으므로
    // 무효화가 필요 없고, 그래서 immutable 을 쓸 수 있다.
    expect(IMMUTABLE_1Y).toBe('public, max-age=31536000, immutable')
    expect(IMMUTABLE_1Y).toContain('immutable')
  })

  it('max-age 가 실제로 1년이다', () => {
    const maxAge = /max-age=(\d+)/u.exec(IMMUTABLE_1Y)?.[1] ?? '0'

    expect(Number(maxAge)).toBe(365 * 24 * 60 * 60)
  })

  it('NO_STORE 는 캐시를 남기지 않는다', () => {
    expect(NO_STORE).toBe('no-store')
  })

  it('공개 캐시는 public 을 명시한다', () => {
    // private 이면 CDN 이 캐시하지 않아 오리진으로 전부 온다.
    expect(IMMUTABLE_1Y.startsWith('public')).toBe(true)
  })
})
