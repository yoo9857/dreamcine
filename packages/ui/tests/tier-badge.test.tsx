// @vitest-environment jsdom

import { MemberTier, TIER_LABELS } from '@aidream/core'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it } from 'vitest'

import { contrastRatio } from '../src/tokens/contrast.js'
import { THEMES, themeTokens, type Theme } from '../src/tokens/index.js'
import { TierBadge } from '../src/primitives/TierBadge.js'

afterEach(() => {
  cleanup()
})

/** 10_NFR.md §10 — 본문 4.5:1, 비텍스트 3:1. */
const TEXT_MIN = 4.5
const UI_MIN = 3

const BADGED = MemberTier.filter((tier) => tier !== 'BRONZE')

describe('TierBadge', () => {
  it('BRONZE 는 아무것도 그리지 않는다', () => {
    // 전원이 배지를 달면 배지가 신호가 아니다. (ISS-020)
    const { container } = render(<TierBadge tier="BRONZE" />)
    expect(container.innerHTML).toBe('')
  })

  it('BRONZE 는 compact 모드에서도 그리지 않는다', () => {
    const { container } = render(<TierBadge tier="BRONZE" compact />)
    expect(container.innerHTML).toBe('')
  })

  it.each(BADGED)('%s 는 한국어 등급 이름을 보여준다', (tier) => {
    render(<TierBadge tier={tier} />)
    expect(screen.getByText(TIER_LABELS[tier])).toBeTruthy()
  })

  it.each(BADGED)(
    '%s compact 는 색 대신 이름을 접근성 레이블로 남긴다',
    (tier) => {
      // 색만으로 등급을 구분하면 색각 이상 사용자에게는 정보가 사라진다.
      render(<TierBadge tier={tier} compact />)
      const mark = screen.getByRole('img')
      expect(mark.getAttribute('aria-label')).toBe(`${TIER_LABELS[tier]} 등급`)
    },
  )

  it.each(BADGED)('%s 는 title 로도 등급을 알려준다', (tier) => {
    const { container } = render(<TierBadge tier={tier} />)
    const node = container.querySelector('[title]')
    expect(node?.getAttribute('title')).toBe(`${TIER_LABELS[tier]} 등급`)
  })
})

describe.each(THEMES)('%s 테마 등급 색 대비', (theme: Theme) => {
  const { color } = themeTokens(theme)
  const surfaces = [
    ['bg.base', color.bg.base],
    ['bg.elevated', color.bg.elevated],
    ['bg.overlay', color.bg.overlay],
  ] as const

  const subtleSurfaces = [
    ['silverSubtle', color.tier.silverSubtle],
    ['goldSubtle', color.tier.goldSubtle],
    ['platinumSubtle', color.tier.platinumSubtle],
    ['diamondSubtle', color.tier.diamondSubtle],
  ] as const

  const baseColors = [
    ['silver', color.tier.silver],
    ['gold', color.tier.gold],
    ['platinum', color.tier.platinum],
    ['diamond', color.tier.diamond],
  ] as const

  it.each(subtleSurfaces)(
    'fg.primary on tier.%s ≥ 4.5:1',
    (_name, background) => {
      // 배지 안의 글자가 읽혀야 한다.
      expect(
        contrastRatio(color.fg.primary, background),
      ).toBeGreaterThanOrEqual(TEXT_MIN)
    },
  )

  it.each(
    baseColors.flatMap(([tierName, tierColor]) =>
      surfaces.map(
        ([surfaceName, surface]) =>
          [`tier.${tierName} on ${surfaceName}`, tierColor, surface] as const,
      ),
    ),
  )('%s ≥ 3:1 (WCAG 1.4.11)', (_label, tierColor, surface) => {
    // base 는 테두리와 점에 쓰인다 — 비텍스트 대비 기준을 넘어야 보인다.
    expect(contrastRatio(tierColor, surface)).toBeGreaterThanOrEqual(UI_MIN)
  })

  it('등급 색이 서로 구별된다', () => {
    // 두 등급이 같은 색이면 배지가 등급을 알려주지 못한다.
    const values = baseColors.map(([, value]) => value)
    expect(new Set(values).size).toBe(values.length)
  })

  it('등급 색은 상태 색과 같지 않다', () => {
    /*
      warning / success 를 재사용하면, 상태 색을 조정할 때 등급 배지가 조용히
      따라 변한다. 등급은 상태가 아니다. 값이 우연히 같아지는 것도 막는다.
    */
    const statusColors = [
      color.warning.base,
      color.warning.subtle,
      color.success.base,
      color.success.subtle,
      color.danger.base,
      color.danger.subtle,
    ]
    for (const [, tierColor] of [...baseColors, ...subtleSurfaces]) {
      expect(statusColors).not.toContain(tierColor)
    }
  })
})
