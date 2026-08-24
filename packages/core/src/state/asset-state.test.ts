import { AssetStatus } from '../enums.js'
import { describe, expect, it } from 'vitest'

import { canTransitionAsset } from './asset-state.js'

const ALLOWED = new Set([
  'PENDING:PROBING',
  'PROBING:TRANSCODING',
  'PROBING:FAILED',
  'TRANSCODING:READY',
  'TRANSCODING:FAILED',
  'FAILED:PENDING',
])

describe('canTransitionAsset', () => {
  it.each(AssetStatus.flatMap((from) => AssetStatus.map((to) => [from, to])))(
    '%s → %s 전이를 판정한다',
    (from, to) => {
      expect(canTransitionAsset(from, to, { attemptCount: 2 })).toBe(
        ALLOWED.has(`${from}:${to}`),
      )
    },
  )

  it('세 번 실패한 자산은 PENDING으로 되돌리지 않는다', () => {
    expect(canTransitionAsset('FAILED', 'PENDING', { attemptCount: 3 })).toBe(
      false,
    )
  })

  it('READY는 종착 상태다', () => {
    for (const to of AssetStatus) {
      expect(canTransitionAsset('READY', to, { attemptCount: 0 })).toBe(false)
    }
  })
})
