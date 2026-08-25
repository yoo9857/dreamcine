import { describe, expect, it } from 'vitest'

import { decideAutoAction } from './moderation.js'

describe('decideAutoAction', () => {
  it.each([
    ['MINOR_SAFETY', 1, 'AUTO_HIDE'],
    ['SEXUAL', 3, 'AUTO_HIDE'],
    ['COPYRIGHT', 3, 'AUTO_HIDE'],
    ['VIOLENCE', 5, 'AUTO_HIDE'],
    ['HATE', 2, 'PRIORITIZE'],
    ['SPAM', 1, 'NONE'],
  ] as const)('%s 신고자 %i명은 %s', (reason, distinctReporters, expected) => {
    expect(
      decideAutoAction({
        reportCount: distinctReporters,
        distinctReporters,
        reason,
        targetAgeHours: 1,
      }),
    ).toBe(expected)
  })

  it('같은 신고자의 반복 신고 수는 자동 숨김 판단에 쓰지 않는다', () => {
    expect(
      decideAutoAction({
        reportCount: 5,
        distinctReporters: 1,
        reason: 'OTHER',
        targetAgeHours: 1,
      }),
    ).toBe('NONE')
  })
})
