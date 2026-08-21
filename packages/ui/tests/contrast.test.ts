import { AppError } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import {
  contrastRatio,
  parseHex,
  relativeLuminance,
} from '../src/tokens/contrast.js'

describe('parseHex', () => {
  it('#rrggbb 를 읽는다', () => {
    expect(parseHex('#1a2b3c')).toEqual({ r: 0x1a, g: 0x2b, b: 0x3c })
  })

  it('#rgb 를 두 배로 늘려 읽는다', () => {
    expect(parseHex('#abc')).toEqual({ r: 0xaa, g: 0xbb, b: 0xcc })
  })

  it('대문자와 공백을 허용한다', () => {
    expect(parseHex('  #FF00AA ')).toEqual({ r: 255, g: 0, b: 170 })
  })

  it.each(['1a2b3c', '#12', '#12345', '#1234567', 'rgb(0,0,0)', '', '#gggggg'])(
    '잘못된 형식 %s 은 E_VALIDATION',
    (value) => {
      expect(() => parseHex(value)).toThrow(AppError)
      try {
        parseHex(value)
      } catch (error: unknown) {
        expect(error).toMatchObject({ code: 'E_VALIDATION' })
      }
    },
  )
})

describe('relativeLuminance', () => {
  it('검정은 0, 흰색은 1', () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBeCloseTo(0, 6)
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 6)
  })

  it('WCAG 계수대로 초록이 가장 밝다', () => {
    const red = relativeLuminance({ r: 255, g: 0, b: 0 })
    const green = relativeLuminance({ r: 0, g: 255, b: 0 })
    const blue = relativeLuminance({ r: 0, g: 0, b: 255 })

    expect(green).toBeGreaterThan(red)
    expect(red).toBeGreaterThan(blue)
    expect(red).toBeCloseTo(0.2126, 4)
    expect(green).toBeCloseTo(0.7152, 4)
    expect(blue).toBeCloseTo(0.0722, 4)
  })
})

describe('contrastRatio', () => {
  // 널리 알려진 기준값으로 계산기 자체를 검증한다.
  it.each([
    ['#000000', '#ffffff', 21],
    ['#ffffff', '#ffffff', 1],
    ['#000000', '#000000', 1],
    ['#767676', '#ffffff', 4.54],
    ['#ffffff', '#0000ff', 8.59],
    ['#595959', '#ffffff', 7.0],
  ] as const)('%s ↔ %s = %s', (a, b, expected) => {
    expect(contrastRatio(a, b)).toBeCloseTo(expected, 1)
  })

  it('인자 순서와 무관하다', () => {
    expect(contrastRatio('#123456', '#fedcba')).toBeCloseTo(
      contrastRatio('#fedcba', '#123456'),
      10,
    )
  })

  it('항상 1 이상 21 이하다', () => {
    const samples = ['#000', '#fff', '#f00', '#0f0', '#00f', '#808080']
    for (const a of samples) {
      for (const b of samples) {
        const ratio = contrastRatio(a, b)
        expect(ratio).toBeGreaterThanOrEqual(1)
        expect(ratio).toBeLessThanOrEqual(21)
      }
    }
  })
})
