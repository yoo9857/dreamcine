import { NotImplementedError } from '@aidream/core'

import type { Messages } from './ko.js'

export type Locale = 'ko'

/** i18n 구조만 잡고 `ko` 만 채운다. (00_PRODUCT.md 비범위) */
export const DEFAULT_LOCALE: Locale = 'ko'

export function messages(_locale: Locale = DEFAULT_LOCALE): Messages {
  throw new NotImplementedError('T14:messages')
}
