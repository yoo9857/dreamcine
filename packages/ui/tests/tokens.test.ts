import { describe, expect, it } from 'vitest'

import { contrastRatio } from '../src/tokens/contrast.js'
import {
  BREAKPOINTS,
  COLOR_VARIABLE_NAMES,
  THEMES,
  VAR_PREFIX,
  darkTokens,
  lightTokens,
  renderThemeCss,
  themeTokens,
  type Theme,
  type Tokens,
} from '../src/tokens/index.js'

/** 10_NFR.md §10 — 본문 4.5:1, 큰 텍스트·비텍스트 3:1. */
const TEXT_MIN = 4.5
const UI_MIN = 3

const HEX = /^#[0-9a-f]{6}$/u

function surfaces(tokens: Tokens): readonly [string, string][] {
  return [
    ['bg.base', tokens.color.bg.base],
    ['bg.elevated', tokens.color.bg.elevated],
    ['bg.overlay', tokens.color.bg.overlay],
  ]
}

function textColors(tokens: Tokens): readonly [string, string][] {
  return [
    ['fg.primary', tokens.color.fg.primary],
    ['fg.secondary', tokens.color.fg.secondary],
    ['fg.muted', tokens.color.fg.muted],
    ['accent.base', tokens.color.accent.base],
    ['accent.hover', tokens.color.accent.hover],
    ['danger.base', tokens.color.danger.base],
    ['warning.base', tokens.color.warning.base],
    ['success.base', tokens.color.success.base],
  ]
}

function subtleSurfaces(tokens: Tokens): readonly [string, string][] {
  return [
    ['accent.subtle', tokens.color.accent.subtle],
    ['danger.subtle', tokens.color.danger.subtle],
    ['warning.subtle', tokens.color.warning.subtle],
    ['success.subtle', tokens.color.success.subtle],
  ]
}

describe.each(THEMES)('%s 테마 대비', (theme: Theme) => {
  const tokens = themeTokens(theme)

  it.each(
    surfaces(tokens).flatMap(([bgName, bg]) =>
      textColors(tokens).map(
        ([fgName, fg]) => [`${fgName} on ${bgName}`, fg, bg] as const,
      ),
    ),
  )('%s ≥ 4.5:1', (_label, fg, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(TEXT_MIN)
  })

  it.each(subtleSurfaces(tokens))('fg.primary on %s ≥ 4.5:1', (_name, bg) => {
    expect(contrastRatio(tokens.color.fg.primary, bg)).toBeGreaterThanOrEqual(
      TEXT_MIN,
    )
  })

  it.each([
    ['accent.base', tokens.color.accent.base],
    ['accent.hover', tokens.color.accent.hover],
    ['danger.base', tokens.color.danger.base],
  ] as const)('bg.base 라벨 on %s ≥ 4.5:1', (_name, background) => {
    // 강조 배경 위의 버튼 라벨. 여기서 미달하면 주요 버튼 글자가 안 읽힌다.
    expect(
      contrastRatio(tokens.color.bg.base, background),
    ).toBeGreaterThanOrEqual(TEXT_MIN)
  })

  it.each(surfaces(tokens))(
    'border.base on %s ≥ 3:1 (WCAG 1.4.11)',
    (_name, bg) => {
      expect(
        contrastRatio(tokens.color.border.base, bg),
      ).toBeGreaterThanOrEqual(UI_MIN)
    },
  )

  it('border.subtle 은 장식용이라 3:1 을 요구하지 않지만 보여야 한다', () => {
    const ratio = contrastRatio(
      tokens.color.border.subtle,
      tokens.color.bg.base,
    )
    expect(ratio).toBeGreaterThan(1.05)
    expect(ratio).toBeLessThan(UI_MIN)
  })
})

describe('토큰 구조', () => {
  it.each(THEMES)('%s 의 모든 색이 #rrggbb 형식이다', (theme: Theme) => {
    const { color } = themeTokens(theme)
    const groups: readonly Readonly<Record<string, string>>[] = [
      color.bg,
      color.fg,
      color.accent,
      color.danger,
      color.warning,
      color.success,
      color.tier,
      color.border,
    ]

    for (const group of groups) {
      for (const value of Object.values(group)) {
        expect(value).toMatch(HEX)
      }
    }
  })

  it('간격 · 반경 · z 는 테마와 무관하게 같다', () => {
    expect(darkTokens.space).toEqual(lightTokens.space)
    expect(darkTokens.radius).toEqual(lightTokens.radius)
    expect(darkTokens.z).toEqual(lightTokens.z)
    expect(darkTokens.font).toEqual(lightTokens.font)
  })

  it('08_UIUX §7 의 간격 · 반경 값을 그대로 쓴다', () => {
    expect(darkTokens.space).toEqual({
      1: '4px',
      2: '8px',
      3: '12px',
      4: '16px',
      6: '24px',
      8: '32px',
      12: '48px',
    })
    expect(darkTokens.radius).toEqual({
      sm: '6px',
      md: '10px',
      lg: '16px',
      full: '9999px',
    })
    expect(darkTokens.z).toEqual({
      base: 0,
      sticky: 10,
      overlay: 100,
      modal: 1000,
      toast: 2000,
    })
  })

  it('웹폰트를 쓰지 않는다', () => {
    expect(darkTokens.font.sans).toContain('system-ui')
    expect(darkTokens.font.sans).not.toContain('url(')
  })

  it('알 수 없는 테마 이름은 다크로 떨어진다', () => {
    expect(themeTokens('dark')).toBe(darkTokens)
    expect(themeTokens('light')).toBe(lightTokens)
  })
})

describe('renderThemeCss', () => {
  const css = renderThemeCss()

  it('다크를 기본으로 :root 에 싣는다', () => {
    expect(css).toContain(':root {')
    expect(css).toContain(`--aidream-bg: ${darkTokens.color.bg.base};`)
    expect(css).toContain('color-scheme: dark;')
  })

  it('시스템이 라이트면 라이트로 바꾼다', () => {
    expect(css).toContain('@media (prefers-color-scheme: light)')
    expect(css).toContain(`--aidream-bg: ${lightTokens.color.bg.base};`)
  })

  it('명시적 선택이 시스템 설정을 이긴다', () => {
    const mediaIndex = css.indexOf('@media (prefers-color-scheme: light)')
    const explicitIndex = css.indexOf("[data-theme='light']")
    expect(mediaIndex).toBeGreaterThan(-1)
    expect(explicitIndex).toBeGreaterThan(mediaIndex)
    expect(css).toContain("[data-theme='dark']")
  })

  it('모든 색 토큰이 런타임 변수로 나온다', () => {
    for (const name of COLOR_VARIABLE_NAMES) {
      expect(css).toContain(`${VAR_PREFIX}-${name}:`)
    }
    // 17 기본 + 등급 8 (ISS-020). 이름 배열과 값 배열의 길이가 어긋나면
    // renderThemeCss 가 잘못된 쌍을 내보내므로 숫자를 못 박아 둔다.
    expect(COLOR_VARIABLE_NAMES).toHaveLength(25)
  })

  it('간격 · 반경 · 폰트 · z 변수를 싣는다', () => {
    expect(css).toContain('--aidream-space-1: 4px;')
    expect(css).toContain('--aidream-space-12: 48px;')
    expect(css).toContain('--aidream-radius-full: 9999px;')
    expect(css).toContain('--aidream-font-sans: system-ui')
    expect(css).toContain('--aidream-z-toast: 2000;')
  })

  describe('Tailwind 브리지', () => {
    it('@theme inline 블록을 만든다', () => {
      expect(css).toContain('@theme inline {')
    })

    it('모든 색 토큰을 Tailwind 네임스페이스로 잇는다', () => {
      for (const name of COLOR_VARIABLE_NAMES) {
        expect(css).toContain(`--color-${name}: var(${VAR_PREFIX}-${name});`)
      }
    })

    it('간격 · 반경 · 폰트도 잇는다', () => {
      expect(css).toContain('--spacing-4: var(--aidream-space-4);')
      expect(css).toContain('--radius-md: var(--aidream-radius-md);')
      expect(css).toContain('--font-sans: var(--aidream-font-sans);')
    })

    it('테마에 따라 바뀌는 값은 참조만 한다 (복사하지 않는다)', () => {
      const bridge = css.slice(css.indexOf('@theme inline {'))
      // 색 리터럴이 브리지에 들어가면 테마 전환이 죽는다.
      expect(bridge).not.toMatch(/#[0-9a-f]{3,6}/iu)

      // 색·간격·반경·폰트는 전부 런타임 변수 참조여야 한다.
      const copied = bridge
        .split(/\r?\n/u)
        .filter((line) => /^\s*--(color|spacing|radius|font)-/u.test(line))
        .filter((line) => !line.includes(`var(${VAR_PREFIX}`))
      expect(copied).toEqual([])
    })

    it('브레이크포인트는 값을 그대로 싣는다', () => {
      // 브레이크포인트는 테마에 따라 바뀌지 않는다. 런타임 변수로 우회하면
      // 미디어 쿼리에서 쓸 수 없다 — CSS 변수는 @media 조건에 못 들어간다.
      for (const [name, value] of Object.entries(BREAKPOINTS)) {
        expect(css).toContain(`--breakpoint-${name}: ${value};`)
      }
    })

    it('브리지가 런타임 변수보다 뒤에 온다', () => {
      expect(css.indexOf('@theme inline {')).toBeGreaterThan(
        css.indexOf("[data-theme='dark']"),
      )
    })
  })

  it('두 번 호출해도 같은 문자열이다', () => {
    expect(renderThemeCss()).toBe(css)
  })
})
