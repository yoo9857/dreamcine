import type { Messages } from './ko.js'
import { koMessages } from './ko.js'

export type { Messages } from './ko.js'

export type Locale = 'ko'

/** i18n 구조만 잡고 `ko` 만 채운다. (00_PRODUCT.md 비범위) */
export const DEFAULT_LOCALE: Locale = 'ko'

const CATALOG: Readonly<Record<Locale, () => Messages>> = {
  ko: koMessages,
}

export function messages(locale: Locale = DEFAULT_LOCALE): Messages {
  return CATALOG[locale]()
}
