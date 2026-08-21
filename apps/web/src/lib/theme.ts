import type { Theme } from '@aidream/ui'

/** 테마 선택을 담는 쿠키. 서버가 읽어 첫 페인트부터 반영한다. */
export const THEME_COOKIE = 'aidream-theme'

export const THEME_COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60

/**
 * 값이 이상하면 null 을 돌려 시스템 설정(`prefers-color-scheme`)으로 맡긴다.
 * 던지지 않는다 — 테마 쿠키가 깨졌다고 화면이 죽을 이유가 없다.
 */
export function parseTheme(value: string | undefined): Theme | null {
  return value === 'dark' || value === 'light' ? value : null
}

export function themeCookie(theme: Theme): string {
  const parts = [
    `${THEME_COOKIE}=${theme}`,
    'Path=/',
    `Max-Age=${String(THEME_COOKIE_MAX_AGE_SEC)}`,
    'SameSite=Lax',
  ]
  if (process.env.NODE_ENV === 'production') {
    parts.push('Secure')
  }
  return parts.join('; ')
}
