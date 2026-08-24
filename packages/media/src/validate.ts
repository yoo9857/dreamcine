import { AppError, type Capacity } from '@aidream/core'

import type { ProbeResult } from './probe.js'

export function validateProbe(result: ProbeResult, capacity: Capacity): void {
  if (result.videoCodec === '') {
    throw new AppError('E_MEDIA_NO_VIDEO_STREAM')
  }
  if (!result.hasAudio || result.audioCodec === null) {
    throw new AppError('E_MEDIA_NO_AUDIO_STREAM')
  }

  const videoCodec = result.videoCodec.toLowerCase()
  const audioCodec = result.audioCodec.toLowerCase()
  const allowedVideoCodecs = new Set(['h264', 'hevc', 'vp9', 'av1'])
  const allowedAudioCodecs = new Set(['aac', 'mp3', 'opus', 'flac'])
  if (
    !allowedVideoCodecs.has(videoCodec) ||
    !allowedAudioCodecs.has(audioCodec)
  ) {
    throw new AppError('E_MEDIA_UNSUPPORTED_CODEC', {
      videoCodec,
      audioCodec,
    })
  }

  if (
    Math.max(result.width, result.height) < 640 ||
    Math.min(result.width, result.height) < 360
  ) {
    throw new AppError('E_MEDIA_RESOLUTION_TOO_LOW', {
      width: result.width,
      height: result.height,
    })
  }
  if (result.durationSec > capacity.videoMaxDurationSec) {
    throw new AppError('E_MEDIA_DURATION_TOO_LONG', {
      durationSec: result.durationSec,
      limitSec: capacity.videoMaxDurationSec,
    })
  }
}
