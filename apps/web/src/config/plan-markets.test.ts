import { describe, expect, it } from 'vitest'

import {
  formatPlanPrice,
  getPlanRegion,
  getPlanVariant,
  getPlanVariantByRoute,
  PLAN_VARIANTS,
} from './plan-markets'

describe('plan market catalog', () => {
  it('keeps every public route and hreflang unique', () => {
    expect(new Set(PLAN_VARIANTS.map(({ route }) => route)).size).toBe(
      PLAN_VARIANTS.length,
    )
    expect(new Set(PLAN_VARIANTS.map(({ hrefLang }) => hrefLang)).size).toBe(
      PLAN_VARIANTS.length,
    )
  })

  it('resolves Korean, Korean-English, and US-English routes', () => {
    expect(getPlanVariantByRoute('/ads-plan')?.key).toBe('ko-KR')
    expect(getPlanVariantByRoute('/kr-en/ads-plan')?.key).toBe('en-KR')
    expect(getPlanVariantByRoute('/en-us/ads-plan')?.key).toBe('en-US')
  })

  it('uses market-owned prices and tax modes', () => {
    expect(formatPlanPrice('KR', 'ko')).toContain('6,900')
    expect(formatPlanPrice('US', 'en')).toBe('$4.99')
    expect(getPlanRegion('KR').taxDisplay).toBe('included')
    expect(getPlanRegion('US').taxDisplay).toBe('added-at-checkout')
  })

  it('falls back to the primary configured variant', () => {
    expect(getPlanVariant('ko', 'US').key).toBe('ko-KR')
  })
})
