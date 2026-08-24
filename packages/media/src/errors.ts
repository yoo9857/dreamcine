import { NotImplementedError, type ErrorCode } from '@aidream/core'

export interface FfmpegFailure {
  readonly stderr: string
  readonly timedOut: boolean
}

export function classifyFfmpegError(failure: FfmpegFailure): ErrorCode {
  void failure
  throw new NotImplementedError('T06:classifyFfmpegError')
}
