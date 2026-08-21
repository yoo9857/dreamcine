import { NotImplementedError } from '@aidream/core'

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
 * 값은 여기서만 정의한다. 컴포넌트는 색·간격 리터럴을 쓰지 않는다.
 * (08_UIUX_SPEC.md §7)
 */
export function themeTokens(_theme: Theme): Tokens {
  throw new NotImplementedError('T14:tokens')
}

/** 토큰에서 파생된 CSS 변수 블록. `theme.css` 의 유일한 생성 경로다. */
export function renderThemeCss(): string {
  throw new NotImplementedError('T14:themeCss')
}
