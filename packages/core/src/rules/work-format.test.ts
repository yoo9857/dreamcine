import { describe, expect, it } from 'vitest'

import {
  aspectRatioOf,
  isShortFormFormat,
  isShortFormWork,
} from './work-format.js'

function item(
  workType: 'SERIES' | 'SHORT_FORM' | 'FILM' | undefined,
  aspectRatio: number | null,
) {
  return {
    series: {
      id: 'series',
      title: '작품',
      slug: 'work',
      ...(workType === undefined ? {} : { workType }),
    },
    aspectRatio,
  }
}

describe('aspectRatioOf', () => {
  it('divides width by height', () => {
    expect(aspectRatioOf(1920, 1080)).toBeCloseTo(16 / 9)
    expect(aspectRatioOf(1080, 1920)).toBeCloseTo(9 / 16)
  })

  it('returns null when either side is missing or not positive', () => {
    expect(aspectRatioOf(null, 1080)).toBeNull()
    expect(aspectRatioOf(1920, null)).toBeNull()
    expect(aspectRatioOf(undefined, undefined)).toBeNull()
    expect(aspectRatioOf(0, 1080)).toBeNull()
    expect(aspectRatioOf(1920, -1)).toBeNull()
  })
})

describe('isShortFormWork', () => {
  it('trusts an explicit short form work type', () => {
    expect(isShortFormWork(item('SHORT_FORM', 16 / 9))).toBe(true)
  })

  it('reads the video ratio when the uploader picked no short form', () => {
    expect(isShortFormWork(item('SERIES', 9 / 16))).toBe(true)
    expect(isShortFormWork(item(undefined, 9 / 16))).toBe(true)
  })

  it('keeps landscape and square works in long form', () => {
    expect(isShortFormWork(item('SERIES', 16 / 9))).toBe(false)
    expect(isShortFormWork(item('FILM', 1))).toBe(false)
  })

  it('keeps works without a known ratio in long form', () => {
    expect(isShortFormWork(item('SERIES', null))).toBe(false)
  })
})

describe('isShortFormFormat', () => {
  it('uses the same rule for a series as for a feed item', () => {
    // 형식을 고르지 않은 세로 광고(lip balm, 0.5625)는 어디서나 숏폼이다
    expect(isShortFormFormat({ workType: 'AD', aspectRatio: 0.5625 })).toBe(
      true,
    )
    expect(
      isShortFormFormat({ workType: 'SHORT_FORM', aspectRatio: null }),
    ).toBe(true)
    expect(isShortFormFormat({ workType: 'SERIES', aspectRatio: 16 / 9 })).toBe(
      false,
    )
    // 비율을 아직 모르면(공개 회차 없음) 형식만 본다
    expect(isShortFormFormat({ workType: 'FILM' })).toBe(false)
    // 정사각은 롱폼
    expect(isShortFormFormat({ workType: 'SERIES', aspectRatio: 1 })).toBe(
      false,
    )
  })
})
