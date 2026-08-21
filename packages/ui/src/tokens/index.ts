export type Theme = 'dark' | 'light'

export interface ColorTokens {
  readonly bg: {
    readonly base: string
    readonly elevated: string
    readonly overlay: string
  }
  readonly fg: {
    readonly primary: string
    readonly secondary: string
    readonly muted: string
  }
  readonly accent: {
    readonly base: string
    readonly hover: string
    readonly subtle: string
  }
  readonly danger: { readonly base: string; readonly subtle: string }
  readonly warning: { readonly base: string; readonly subtle: string }
  readonly success: { readonly base: string; readonly subtle: string }
  readonly border: { readonly base: string; readonly subtle: string }
}

export type SpaceKey = 1 | 2 | 3 | 4 | 6 | 8 | 12

export interface Tokens {
  readonly color: ColorTokens
  readonly space: Readonly<Record<SpaceKey, string>>
  readonly radius: {
    readonly sm: string
    readonly md: string
    readonly lg: string
    readonly full: string
  }
  readonly font: { readonly sans: string; readonly mono: string }
  readonly z: {
    readonly base: number
    readonly sticky: number
    readonly overlay: number
    readonly modal: number
    readonly toast: number
  }
}

export const THEMES: readonly Theme[] = ['dark', 'light']

/**
 * 08_UIUX_SPEC.md §2 의 피드 열 수 표에서 온 브레이크포인트.
 * 640(sm) · 1024(lg) 는 Tailwind 기본값과 같아서 다시 정의하지 않고,
 * 표에만 있는 1440 을 이름 있는 브레이크포인트로 올린다.
 * 컴포넌트가 `min-[1440px]:` 같은 리터럴을 쓰지 않게 하는 것이 목적이다.
 */
export const BREAKPOINTS = { wide: '1440px' } as const

export type BreakpointName = keyof typeof BREAKPOINTS

/** 테마와 무관한 값. 색만 테마별로 갈린다. */
const SHARED = {
  space: {
    1: '4px',
    2: '8px',
    3: '12px',
    4: '16px',
    6: '24px',
    8: '32px',
    12: '48px',
  },
  radius: { sm: '6px', md: '10px', lg: '16px', full: '9999px' },
  font: {
    // 웹폰트를 쓰지 않는다. CSP 의 font-src 는 'self' 뿐이고, 폰트 로딩 지연이
    // LCP 를 밀어낸다. (08_UIUX_SPEC.md §7, §8)
    sans: "system-ui, -apple-system, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif",
    mono: "ui-monospace, SFMono-Regular, 'Cascadia Mono', Consolas, 'Liberation Mono', monospace",
  },
  z: { base: 0, sticky: 10, overlay: 100, modal: 1000, toast: 2000 },
} as const

/**
 * 다크 기본. 영상 서비스 관례다. (08_UIUX_SPEC.md §7)
 *
 * 색 값은 **대비 계산으로 수렴시킨 결과**다. `tests/tokens.test.ts` 가 본문
 * 4.5:1 · UI 경계 3:1 을 전수 검사하므로, 값을 바꾸면 그 테스트가 먼저 막는다.
 * 눈으로 고르고 나중에 확인하는 순서가 아니다.
 */
export const darkTokens: Tokens = {
  color: {
    bg: { base: '#0b0b10', elevated: '#16161d', overlay: '#21212b' },
    fg: { primary: '#f4f4f7', secondary: '#bcbcc9', muted: '#9c9caa' },
    accent: { base: '#8b7cf6', hover: '#a394f8', subtle: '#1e1a3d' },
    danger: { base: '#ff7a7a', subtle: '#3a1620' },
    warning: { base: '#f0b849', subtle: '#3a2c12' },
    success: { base: '#4ade80', subtle: '#12301f' },
    // border.base 는 **컨트롤 경계**다. WCAG 1.4.11 의 3:1 을 만족해야 하므로
    // 장식용 구분선보다 훨씬 밝다. 구분선에는 border.subtle 을 쓴다.
    border: { base: '#71717f', subtle: '#2a2a35' },
  },
  ...SHARED,
}

export const lightTokens: Tokens = {
  color: {
    bg: { base: '#ffffff', elevated: '#f6f6f9', overlay: '#ffffff' },
    fg: { primary: '#16161d', secondary: '#4a4a58', muted: '#5f5f6d' },
    accent: { base: '#5b3fd6', hover: '#4a31b8', subtle: '#efeaff' },
    danger: { base: '#c2261f', subtle: '#fdeceb' },
    warning: { base: '#8a5a00', subtle: '#fdf3e0' },
    success: { base: '#1a7a45', subtle: '#e7f6ed' },
    border: { base: '#86869a', subtle: '#e4e4ea' },
  },
  ...SHARED,
}

/**
 * 값은 여기서만 정의한다. 컴포넌트는 색·간격 리터럴을 쓰지 않는다.
 * (08_UIUX_SPEC.md §7)
 */
export function themeTokens(theme: Theme): Tokens {
  return theme === 'light' ? lightTokens : darkTokens
}

const SPACE_KEYS: readonly SpaceKey[] = [1, 2, 3, 4, 6, 8, 12]

/**
 * 런타임 색 변수 이름. Tailwind 의 `--color-*` 네임스페이스와 겹치지 않게
 * 접두를 붙인다. 브리지가 `@theme inline` 으로 둘을 잇는다.
 */
export const COLOR_VARIABLE_NAMES = [
  'bg',
  'bg-elevated',
  'bg-overlay',
  'fg',
  'fg-secondary',
  'fg-muted',
  'accent',
  'accent-hover',
  'accent-subtle',
  'danger',
  'danger-subtle',
  'warning',
  'warning-subtle',
  'success',
  'success-subtle',
  'border',
  'border-subtle',
] as const

export const VAR_PREFIX = '--aidream'

function colorValues(tokens: Tokens): readonly string[] {
  const { color } = tokens
  return [
    color.bg.base,
    color.bg.elevated,
    color.bg.overlay,
    color.fg.primary,
    color.fg.secondary,
    color.fg.muted,
    color.accent.base,
    color.accent.hover,
    color.accent.subtle,
    color.danger.base,
    color.danger.subtle,
    color.warning.base,
    color.warning.subtle,
    color.success.base,
    color.success.subtle,
    color.border.base,
    color.border.subtle,
  ]
}

function colorVariables(tokens: Tokens): string[] {
  const values = colorValues(tokens)
  return COLOR_VARIABLE_NAMES.map(
    (name, index) => `${VAR_PREFIX}-${name}: ${values[index] ?? ''};`,
  )
}

const RADIUS_KEYS = ['sm', 'md', 'lg', 'full'] as const
const FONT_KEYS = ['sans', 'mono'] as const
const Z_KEYS = ['base', 'sticky', 'overlay', 'modal', 'toast'] as const

function staticVariables(tokens: Tokens): string[] {
  return [
    ...SPACE_KEYS.map(
      (key) => `${VAR_PREFIX}-space-${String(key)}: ${tokens.space[key]};`,
    ),
    ...RADIUS_KEYS.map(
      (key) => `${VAR_PREFIX}-radius-${key}: ${tokens.radius[key]};`,
    ),
    ...FONT_KEYS.map(
      (key) => `${VAR_PREFIX}-font-${key}: ${tokens.font[key]};`,
    ),
    ...Z_KEYS.map((key) => `${VAR_PREFIX}-z-${key}: ${String(tokens.z[key])};`),
  ]
}

/**
 * Tailwind 4 브리지. 런타임 변수를 Tailwind 네임스페이스에 이어 붙여
 * `bg-bg-elevated` · `text-fg-muted` · `p-4` 같은 유틸리티가 생기게 한다.
 *
 * `inline` 이라 유틸리티가 `var(--aidream-*)` 를 직접 참조한다. 그래서 테마가
 * 바뀌면 클래스를 다시 만들지 않아도 색이 따라온다.
 *
 * 이 블록도 생성물이다 — 손으로 옮겨 적는 사전을 만들면 반드시 갈라진다.
 */
function themeBridge(): string[] {
  return [
    ...COLOR_VARIABLE_NAMES.map(
      (name) => `--color-${name}: var(${VAR_PREFIX}-${name});`,
    ),
    ...SPACE_KEYS.map(
      (key) =>
        `--spacing-${String(key)}: var(${VAR_PREFIX}-space-${String(key)});`,
    ),
    ...RADIUS_KEYS.map(
      (key) => `--radius-${key}: var(${VAR_PREFIX}-radius-${key});`,
    ),
    ...FONT_KEYS.map((key) => `--font-${key}: var(${VAR_PREFIX}-font-${key});`),
    // 브레이크포인트는 테마와 무관하므로 값을 그대로 싣는다.
    ...Object.entries(BREAKPOINTS).map(
      ([name, value]) => `--breakpoint-${name}: ${value};`,
    ),
  ]
}

function block(selector: string, declarations: readonly string[]): string {
  const body = declarations.map((line) => `  ${line}`).join('\n')
  return `${selector} {\n${body}\n}`
}

/**
 * 토큰에서 파생된 CSS 변수 블록. `theme.css` 의 유일한 생성 경로이며
 * `contract:tokens` 가 파일과 이 함수의 결과를 대조한다.
 *
 * 우선순위: 다크 기본 → 시스템이 라이트면 라이트 → `data-theme` 이 있으면 그것.
 * 명시적 선택이 언제나 시스템 설정을 이긴다.
 */
export function renderThemeCss(): string {
  const light = colorVariables(lightTokens)
  return [
    '/* 생성물이다. 직접 고치지 않는다. `pnpm contract:tokens` 가 대조한다. */',
    '/* 원천: packages/ui/src/tokens/index.ts */',
    '',
    block(':root', [
      ...colorVariables(darkTokens),
      ...staticVariables(darkTokens),
      'color-scheme: dark;',
    ]),
    '',
    '@media (prefers-color-scheme: light) {',
    block("  :root:not([data-theme='dark'])", [
      ...light,
      'color-scheme: light;',
    ])
      .split('\n')
      .map((line) => (line.startsWith('  ') ? line : `  ${line}`))
      .join('\n'),
    '}',
    '',
    block("[data-theme='light']", [...light, 'color-scheme: light;']),
    '',
    block("[data-theme='dark']", [
      ...colorVariables(darkTokens),
      'color-scheme: dark;',
    ]),
    '',
    block('@theme inline', themeBridge()),
    '',
  ].join('\n')
}
