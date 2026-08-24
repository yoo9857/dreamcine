import type { VideoAsset } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import { idempotencyGate } from './idempotency.js'

const NOW = new Date('2026-08-24T00:00:00.000Z')
const ASSET: VideoAsset = {
  id: 'asset_1',
  uploadId: 'upload_1',
  status: 'PENDING',
  originalKey: 'originals/user/upload/video.mp4',
  hlsPrefix: null,
  masterPath: null,
  posterKey: null,
  durationSec: null,
  width: null,
  height: null,
  videoCodec: null,
  audioCodec: null,
  bitrateKbps: null,
  sizeBytes: '1000',
  attemptCount: 0,
  errorCode: null,
  errorDetail: null,
  createdAt: NOW,
  updatedAt: NOW,
  readyAt: null,
}

describe('idempotencyGate', () => {
  it('유효하지 않은 현재 시각을 거부한다', () => {
    expect(() => idempotencyGate(ASSET, new Date(Number.NaN))).toThrow(
      'E_VALIDATION',
    )
  })

  it('삭제된 자산을 성공 스킵한다', () => {
    expect(idempotencyGate(null, NOW)).toBe('SKIP_MISSING')
  })

  it.each([
    { status: 'PENDING', attemptCount: 0 },
    { status: 'FAILED', attemptCount: 2 },
  ] as const)('$status 자산은 처리한다', (patch) => {
    expect(idempotencyGate({ ...ASSET, ...patch }, NOW)).toBe('PROCESS')
  })

  it.each([
    { status: 'READY', attemptCount: 0 },
    { status: 'FAILED', attemptCount: 3 },
  ] as const)('$status 종착 자산은 스킵한다', (patch) => {
    expect(idempotencyGate({ ...ASSET, ...patch }, NOW)).toBe('SKIP_STATE')
  })

  it.each(['PROBING', 'TRANSCODING'] as const)(
    '최근 처리 중인 %s 자산을 스킵한다',
    (status) => {
      expect(idempotencyGate({ ...ASSET, status }, NOW)).toBe('SKIP_STATE')
    },
  )

  it.each(['PROBING', 'TRANSCODING'] as const)(
    '30분 이상 멈춘 %s 자산을 이어받는다',
    (status) => {
      expect(
        idempotencyGate(
          {
            ...ASSET,
            status,
            updatedAt: new Date(NOW.getTime() - 30 * 60 * 1000),
          },
          NOW,
        ),
      ).toBe('PROCESS')
    },
  )
})
