import { describe, expect, it } from 'vitest'

import { classifyFfmpegError } from '../src/errors.js'

describe('classifyFfmpegError', () => {
  it.each([
    ['Invalid data found when processing input', 'E_MEDIA_PROBE_FAILED'],
    ['moov atom not found', 'E_MEDIA_PROBE_FAILED'],
    ['does not contain any stream', 'E_MEDIA_NO_VIDEO_STREAM'],
    [
      'Decoder (codec hevc) not found for input stream',
      'E_MEDIA_UNSUPPORTED_CODEC',
    ],
    ['No space left on device', 'E_MEDIA_DISK_FULL'],
    ['Cannot allocate memory', 'E_MEDIA_TRANSCODE_FAILED'],
    ['unexpected encoder failure', 'E_MEDIA_TRANSCODE_FAILED'],
  ] as const)('%s를 %s로 분류한다', (stderr, expected) => {
    expect(classifyFfmpegError({ stderr, timedOut: false })).toBe(expected)
  })

  it('타임아웃 신호는 stderr보다 우선한다', () => {
    expect(
      classifyFfmpegError({
        stderr: 'No space left on device',
        timedOut: true,
      }),
    ).toBe('E_MEDIA_TRANSCODE_TIMEOUT')
  })

  it('대소문자가 달라도 알려진 패턴을 찾는다', () => {
    expect(
      classifyFfmpegError({
        stderr: 'MOOV ATOM NOT FOUND',
        timedOut: false,
      }),
    ).toBe('E_MEDIA_PROBE_FAILED')
  })
})
