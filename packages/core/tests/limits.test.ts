import { describe, expect, it } from 'vitest'

import { LIMITS } from '../src/limits.js'

describe('LIMITS', () => {
  it('제품 불변 한도를 정확히 보존한다', () => {
    expect(LIMITS.COMMENT_MAX_LEN).toBe(1000)
    expect(LIMITS.PART_COUNT_MAX).toBe(10_000)
    expect(LIMITS.FEED_PAGE_MAX).toBe(50)
    expect(LIMITS.SOFT_DELETE_PURGE_DAYS).toBe(90)
  })

  it('티어 의존 키를 포함하지 않는다', () => {
    const keys = Object.keys(LIMITS)

    expect(keys).not.toContain('UPLOAD_MAX_BYTES')
    expect(keys).not.toContain('VIDEO_MAX_DURATION_SEC')
    expect(keys).not.toContain('WORKER_CONCURRENCY')
    expect(keys).not.toContain('FEED_CACHE_TTL_SEC')
  })
})
