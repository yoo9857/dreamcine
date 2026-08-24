import { AppError, CAPACITY_TIERS } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import type { ProbeResult } from '../src/probe.js'
import { validateProbe } from '../src/validate.js'

const VALID_PROBE: ProbeResult = {
  durationSec: 300,
  width: 1280,
  height: 720,
  videoCodec: 'h264',
  audioCodec: 'aac',
  bitrateKbps: 3000,
  frameRate: 24,
  hasAudio: true,
  rotation: 0,
}

function expectCode(result: ProbeResult, code: AppError['code']): void {
  try {
    validateProbe(result, CAPACITY_TIERS.T0)
    throw new Error('오류가 발생해야 합니다')
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(AppError)
    if (error instanceof AppError) expect(error.code).toBe(code)
  }
}

describe('validateProbe', () => {
  it('허용된 T0 영상을 통과시킨다', () => {
    expect(() => {
      validateProbe(VALID_PROBE, CAPACITY_TIERS.T0)
    }).not.toThrow()
  })

  it('비디오 스트림이 없으면 거부한다', () => {
    expectCode({ ...VALID_PROBE, videoCodec: '' }, 'E_MEDIA_NO_VIDEO_STREAM')
  })

  it('오디오 스트림이 없으면 거부한다', () => {
    expectCode(
      { ...VALID_PROBE, audioCodec: null, hasAudio: false },
      'E_MEDIA_NO_AUDIO_STREAM',
    )
  })

  it.each([
    { videoCodec: 'mpeg2video', audioCodec: 'aac' },
    { videoCodec: 'h264', audioCodec: 'pcm_s16le' },
  ])('허용하지 않은 코덱을 거부한다', ({ videoCodec, audioCodec }) => {
    expectCode(
      { ...VALID_PROBE, videoCodec, audioCodec },
      'E_MEDIA_UNSUPPORTED_CODEC',
    )
  })

  it.each([
    { width: 638, height: 360 },
    { width: 640, height: 358 },
    { width: 360, height: 638 },
  ])('최소 해상도 미만을 거부한다', ({ width, height }) => {
    expectCode({ ...VALID_PROBE, width, height }, 'E_MEDIA_RESOLUTION_TOO_LOW')
  })

  it('현재 티어의 최대 길이를 초과하면 거부한다', () => {
    expectCode(
      {
        ...VALID_PROBE,
        durationSec: CAPACITY_TIERS.T0.videoMaxDurationSec + 1,
      },
      'E_MEDIA_DURATION_TOO_LONG',
    )
  })

  it('대소문자가 다른 허용 코덱도 정규화한다', () => {
    expect(() => {
      validateProbe(
        { ...VALID_PROBE, videoCodec: 'H264', audioCodec: 'AAC' },
        CAPACITY_TIERS.T0,
      )
    }).not.toThrow()
  })
})
