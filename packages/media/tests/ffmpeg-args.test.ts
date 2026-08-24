import { AppError } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import {
  buildHlsArgs,
  buildSpriteArgs,
  buildThumbArgs,
} from '../src/ffmpeg-args.js'
import { buildLadder } from '../src/ladder.js'

const T0_LADDER = ['720p', '360p'] as const

function expectCode(operation: () => unknown, code: AppError['code']): void {
  try {
    operation()
    throw new Error('오류가 발생해야 합니다')
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(AppError)
    if (error instanceof AppError) expect(error.code).toBe(code)
  }
}

describe('buildHlsArgs', () => {
  it('T0 가로영상의 단일 프로세스 HLS 인자를 고정한다', () => {
    const args = buildHlsArgs({
      inputPath: '/tmp/input.mp4',
      outDir: '/tmp/out',
      ladder: buildLadder(1920, 1080, T0_LADDER),
      rotation: 0,
    })

    expect(args).toMatchSnapshot()
  })

  it.each([
    [90, 'transpose=clock'],
    [180, 'hflip,vflip'],
    [270, 'transpose=cclock'],
  ] as const)('%d도 회전 필터를 split 전에 둔다', (rotation, filter) => {
    const args = buildHlsArgs({
      inputPath: 'input.mp4',
      outDir: 'out',
      ladder: buildLadder(720, 1280, T0_LADDER),
      rotation,
    })
    const graph = args[args.indexOf('-filter_complex') + 1]

    expect(graph).toContain(`[0:v]${filter}[rotated];[rotated]split=2`)
  })

  it('키프레임과 HLS 세그먼트 옵션을 고정한다', () => {
    const args = buildHlsArgs({
      inputPath: 'input.mp4',
      outDir: 'out',
      ladder: buildLadder(1280, 720, T0_LADDER),
      rotation: 0,
    })

    expect(args).toEqual(
      expect.arrayContaining([
        '-nostdin',
        '-progress',
        'pipe:2',
        '-g',
        '48',
        '-keyint_min',
        '-sc_threshold',
        '-hls_time',
        '6',
        'independent_segments',
      ]),
    )
  })

  it('세그먼트와 master 경로를 생성한다', () => {
    const args = buildHlsArgs({
      inputPath: 'input.mp4',
      outDir: 'C:\\tmp\\out\\',
      ladder: buildLadder(1280, 720, T0_LADDER),
      rotation: 0,
    })

    expect(args).toContain('C:/tmp/out/%v/seg_%05d.ts')
    expect(args.at(-1)).toBe('C:/tmp/out/%v/index.m3u8')
  })

  it('빈 래더를 정확한 오류코드로 거부한다', () => {
    expectCode(
      () =>
        buildHlsArgs({
          inputPath: 'input.mp4',
          outDir: 'out',
          ladder: [],
          rotation: 0,
        }),
      'E_MEDIA_RESOLUTION_TOO_LOW',
    )
  })

  it('알 수 없는 회전값을 probe 오류로 거부한다', () => {
    expectCode(
      () =>
        buildHlsArgs({
          inputPath: 'input.mp4',
          outDir: 'out',
          ladder: buildLadder(1280, 720, T0_LADDER),
          rotation: 45,
        }),
      'E_MEDIA_PROBE_FAILED',
    )
  })
})

describe('buildThumbArgs', () => {
  it('지정 시점의 한 프레임을 1280×720 crop으로 만든다', () => {
    expect(buildThumbArgs('input.mp4', 12.5, 'thumb.jpg')).toEqual([
      '-hide_banner',
      '-nostdin',
      '-y',
      '-ss',
      '12.5',
      '-i',
      'input.mp4',
      '-frames:v',
      '1',
      '-vf',
      'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720',
      '-q:v',
      '2',
      'thumb.jpg',
    ])
  })

  it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
    '잘못된 시각 %s를 probe 오류로 거부한다',
    (atSec) => {
      expectCode(
        () => buildThumbArgs('input.mp4', atSec, 'thumb.jpg'),
        'E_MEDIA_PROBE_FAILED',
      )
    },
  )
})

describe('buildSpriteArgs', () => {
  it.each([
    [5, 'tile=1x1:nb_frames=1'],
    [95, 'tile=10x1:nb_frames=10'],
    [101, 'tile=10x2:nb_frames=11'],
  ] as const)('%d초 영상의 10초 간격 타일을 계산한다', (durationSec, tile) => {
    const args = buildSpriteArgs('input.mp4', durationSec, 'sprite.jpg')

    expect(args).toContain(
      `select='isnan(prev_selected_t)+gte(t-prev_selected_t,10)',scale=160:90:force_original_aspect_ratio=increase,crop=160:90,${tile}`,
    )
    expect(args).toEqual(
      expect.arrayContaining(['-nostdin', '-frames:v', '1', 'sprite.jpg']),
    )
  })

  it.each([0, -1, Number.NaN])('잘못된 길이 %s를 거부한다', (durationSec) => {
    expectCode(
      () => buildSpriteArgs('input.mp4', durationSec, 'sprite.jpg'),
      'E_MEDIA_PROBE_FAILED',
    )
  })
})
