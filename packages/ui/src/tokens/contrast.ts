import { NotImplementedError } from '@aidream/core'

/** sRGB 0-255 삼원색. */
export interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

/** `#rgb` / `#rrggbb` 를 받는다. 그 밖의 형식은 거부한다. */
export function parseHex(_value: string): Rgb {
  throw new NotImplementedError('T14:contrast')
}

/** WCAG 2.1 상대 휘도. */
export function relativeLuminance(_color: Rgb): number {
  throw new NotImplementedError('T14:contrast')
}

/** WCAG 2.1 대비비. 1 ~ 21. 인자 순서와 무관하다. */
export function contrastRatio(
  _foreground: string,
  _background: string,
): number {
  throw new NotImplementedError('T14:contrast')
}
