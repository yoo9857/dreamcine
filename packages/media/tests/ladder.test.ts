import { describe, expect, it } from 'vitest'

import { buildLadder, type RenditionName } from '../src/ladder.js'

const T1_LADDER = ['1080p', '720p', '480p', '360p'] as const
const T0_LADDER = ['720p', '360p'] as const

function names(
  width: number,
  height: number,
  allowed: readonly RenditionName[] = T1_LADDER,
) {
  return buildLadder(width, height, allowed).map((item) => item.name)
}

describe('buildLadder', () => {
  it.each([
    [1920, 1080, ['1080p', '720p', '480p', '360p']],
    [1280, 720, ['720p', '480p', '360p']],
    [640, 360, ['360p']],
    [1080, 1920, ['1080p', '720p', '480p', '360p']],
    [720, 1280, ['720p', '480p', '360p']],
  ] as const)(
    '%d×%d 원본의 허용 렌디션을 고른다',
    (width, height, expected) => {
      expect(names(width, height)).toEqual(expected)
    },
  )

  it.each([
    [1920, 1080],
    [3840, 2160],
  ])('T0에서는 %d×%d 원본도 2단만 만든다', (width, height) => {
    expect(names(width, height, T0_LADDER)).toEqual(['720p', '360p'])
  })

  it('세로 영상의 출력 방향과 종횡비를 유지한다', () => {
    expect(buildLadder(720, 1280, T1_LADDER)).toEqual([
      {
        name: '720p',
        width: 720,
        height: 1280,
        videoBitrateKbps: 2800,
        audioBitrateKbps: 128,
      },
      {
        name: '480p',
        width: 480,
        height: 854,
        videoBitrateKbps: 1400,
        audioBitrateKbps: 96,
      },
      {
        name: '360p',
        width: 360,
        height: 640,
        videoBitrateKbps: 800,
        audioBitrateKbps: 96,
      },
    ])
  })

  it('모든 출력 치수는 짝수이고 원본을 넘지 않는다', () => {
    const width = 1920
    const height = 800
    const result = buildLadder(width, height, T1_LADDER)

    for (const rendition of result) {
      expect(rendition.width % 2).toBe(0)
      expect(rendition.height % 2).toBe(0)
      expect(rendition.width).toBeLessThanOrEqual(width)
      expect(rendition.height).toBeLessThanOrEqual(height)
    }
  })

  it.each([
    [320, 240],
    [Number.NaN, 720],
    [640, Number.POSITIVE_INFINITY],
  ])(
    '유효하지 않거나 최소 해상도 미만인 %s×%s 입력을 비운다',
    (width, height) => {
      expect(buildLadder(width, height, T1_LADDER)).toEqual([])
    },
  )

  it('허용 목록에 없는 렌디션은 만들지 않는다', () => {
    const allowed: readonly RenditionName[] = ['480p']
    expect(names(1920, 1080, allowed)).toEqual(['480p'])
  })
})
