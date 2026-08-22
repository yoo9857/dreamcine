import { describe, expect, it } from 'vitest'

import { hlsPrefix } from './buckets.js'
import { assertPrefix } from './delete.js'

describe('assertPrefix', () => {
  it('슬래시로 끝나면 통과한다', () => {
    expect(assertPrefix('hls/ast_1/')).toBe('hls/ast_1/')
  })

  it('슬래시가 없으면 거부한다', () => {
    // 'hls/ast_1' 로 지우면 'hls/ast_10/…', 'hls/ast_123/…' 까지 사라진다.
    // 형제 자산이 조용히 지워지고 원인은 몇 주 뒤에 드러난다.
    expect(() => assertPrefix('hls/ast_1')).toThrow(
      expect.objectContaining({ code: 'E_INTERNAL' }) as Error,
    )
  })

  it('빈 프리픽스를 거부한다', () => {
    // 빈 값이면 버킷 전체가 대상이 된다.
    expect(() => assertPrefix('')).toThrow()
  })

  it('hlsPrefix 의 결과는 그대로 통과한다', () => {
    // 우리 키 조립 함수와 삭제 가드가 어긋나면 정상 삭제가 막힌다.
    expect(() => assertPrefix(hlsPrefix('ast_1'))).not.toThrow()
  })

  it('어떤 프리픽스가 문제인지 알려준다', () => {
    let caught: unknown
    try {
      assertPrefix('thumbs/ast_1')
    } catch (error: unknown) {
      caught = error
    }

    expect(
      (caught as { detail?: Record<string, unknown> }).detail,
    ).toMatchObject({ prefix: 'thumbs/ast_1' })
  })
})
