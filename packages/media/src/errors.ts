import type { ErrorCode } from '@aidream/core'

export interface FfmpegFailure {
  readonly stderr: string
  readonly timedOut: boolean
}

export function classifyFfmpegError(failure: FfmpegFailure): ErrorCode {
  if (failure.timedOut) {
    return 'E_MEDIA_TRANSCODE_TIMEOUT'
  }
  if (
    /Invalid data found when processing input/iu.test(failure.stderr) ||
    /moov atom not found/iu.test(failure.stderr)
  ) {
    return 'E_MEDIA_PROBE_FAILED'
  }
  if (/does not contain any stream/iu.test(failure.stderr)) {
    return 'E_MEDIA_NO_VIDEO_STREAM'
  }
  if (/Decoder \(codec .*\) not found/iu.test(failure.stderr)) {
    return 'E_MEDIA_UNSUPPORTED_CODEC'
  }
  if (/No space left on device/iu.test(failure.stderr)) {
    return 'E_MEDIA_DISK_FULL'
  }
  return 'E_MEDIA_TRANSCODE_FAILED'
}
