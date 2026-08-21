import { AppError } from '@aidream/core'

/** sRGB 0-255 삼원색. */
export interface Rgb {
  readonly r: number
  readonly g: number
  readonly b: number
}

const SHORT_HEX = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/iu
const LONG_HEX = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu

/** `#rgb` / `#rrggbb` 를 받는다. 그 밖의 형식은 거부한다. */
export function parseHex(value: string): Rgb {
  const long = LONG_HEX.exec(value.trim())
  if (long !== null) {
    return {
      r: Number.parseInt(long[1] ?? '', 16),
      g: Number.parseInt(long[2] ?? '', 16),
      b: Number.parseInt(long[3] ?? '', 16),
    }
  }

  const short = SHORT_HEX.exec(value.trim())
  if (short !== null) {
    // #abc → #aabbcc
    return {
      r: Number.parseInt(`${short[1] ?? ''}${short[1] ?? ''}`, 16),
      g: Number.parseInt(`${short[2] ?? ''}${short[2] ?? ''}`, 16),
      b: Number.parseInt(`${short[3] ?? ''}${short[3] ?? ''}`, 16),
    }
  }

  throw new AppError('E_VALIDATION', { reason: 'invalid-hex-color' })
}

/** WCAG 2.1 정의의 채널 선형화. */
function linearize(channel: number): number {
  const ratio = channel / 255
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.1 상대 휘도. 검정 0, 흰색 1. */
export function relativeLuminance(color: Rgb): number {
  return (
    0.2126 * linearize(color.r) +
    0.7152 * linearize(color.g) +
    0.0722 * linearize(color.b)
  )
}

/**
 * WCAG 2.1 대비비. 1 ~ 21. 인자 순서와 무관하다.
 * 기준: 본문 4.5:1, 큰 텍스트·비텍스트 3:1. (10_NFR.md §10)
 */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(parseHex(foreground))
  const second = relativeLuminance(parseHex(background))
  const lighter = Math.max(first, second)
  const darker = Math.min(first, second)
  return (lighter + 0.05) / (darker + 0.05)
}
