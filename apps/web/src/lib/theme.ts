import { NotImplementedError } from '@aidream/core'
import type { Theme } from '@aidream/ui'

/** 테마 선택을 담는 쿠키. 서버가 읽어 첫 페인트부터 반영한다. */
export const THEME_COOKIE = 'aidream-theme'

export const THEME_COOKIE_MAX_AGE_SEC = 365 * 24 * 60 * 60

/** 값이 이상하면 시스템 설정으로 폴백한다. 던지지 않는다. */
export function parseTheme(_value: string | undefined): Theme | null {
  throw new NotImplementedError('T14:theme')
}

export function themeCookie(_theme: Theme): string {
  throw new NotImplementedError('T14:theme')
}
