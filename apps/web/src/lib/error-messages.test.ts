import { CAPACITY_TIERS, ERROR_CODES, type ErrorCode } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import {
  MESSAGES,
  messageFor,
  readApiError,
  staticMessageFor,
} from './error-messages'

/** 티어 승급 시 문구가 함께 바뀌어야 하는 코드. (09_ERROR_CATALOG.md §5) */
const TIER_DEPENDENT: readonly ErrorCode[] = [
  'E_UPLOAD_TOO_LARGE',
  'E_UPLOAD_QUOTA_EXCEEDED',
  'E_MEDIA_DURATION_TOO_LONG',
]

describe('MESSAGES', () => {
  it('모든 에러코드에 문구가 있다', () => {
    for (const code of ERROR_CODES) {
      expect(MESSAGES[code], code).toBeDefined()
    }
  })

  it('클라이언트 전용 코드도 문구를 가진다', () => {
    for (const code of [
      'E_OFFLINE',
      'E_PLAYER_UNSUPPORTED',
      'E_PLAYER_MEDIA_ERROR',
      'E_PLAYER_MANIFEST_ERROR',
    ] as const) {
      expect(typeof MESSAGES[code]).toBe('string')
    }
  })

  it('빈 문구가 없다', () => {
    for (const code of ERROR_CODES) {
      expect(messageFor(code, CAPACITY_TIERS.T0).length, code).toBeGreaterThan(
        0,
      )
    }
  })
})

describe('messageFor', () => {
  it('티어 의존 문구는 티어에 따라 달라진다', () => {
    for (const code of TIER_DEPENDENT) {
      expect(messageFor(code, CAPACITY_TIERS.T0), code).not.toBe(
        messageFor(code, CAPACITY_TIERS.T1),
      )
    }
  })

  it('그 밖의 문구는 티어와 무관하다', () => {
    for (const code of ERROR_CODES) {
      if (TIER_DEPENDENT.includes(code)) {
        continue
      }
      expect(messageFor(code, CAPACITY_TIERS.T0), code).toBe(
        messageFor(code, CAPACITY_TIERS.T1),
      )
    }
  })

  it('T0 업로드 상한 2GB 를 문구에 반영한다', () => {
    expect(messageFor('E_UPLOAD_TOO_LARGE', CAPACITY_TIERS.T0)).toContain('2GB')
    expect(messageFor('E_UPLOAD_TOO_LARGE', CAPACITY_TIERS.T1)).toContain('8GB')
  })

  it('T0 영상 길이 20분을 문구에 반영한다', () => {
    expect(
      messageFor('E_MEDIA_DURATION_TOO_LONG', CAPACITY_TIERS.T0),
    ).toContain('20분')
  })

  it('고정 문구에 티어 의존 숫자가 박혀 있지 않다', () => {
    for (const code of ERROR_CODES) {
      const entry = MESSAGES[code]
      if (typeof entry !== 'string') {
        continue
      }
      expect(entry, code).not.toMatch(/\d+\s*GB/u)
    }
  })
})

describe('staticMessageFor', () => {
  it('고정 문구를 그대로 돌려준다', () => {
    expect(staticMessageFor('E_AUTH_REQUIRED')).toBe('로그인이 필요합니다.')
  })

  it('티어 의존 문구는 일반 문구로 대체한다', () => {
    expect(staticMessageFor('E_UPLOAD_TOO_LARGE')).toBe(
      staticMessageFor('E_INTERNAL'),
    )
  })
})

describe('readApiError', () => {
  it('09 §4 형태에서 표시 정보를 꺼낸다', () => {
    expect(
      readApiError({
        error: {
          code: 'E_VALIDATION',
          message: '입력값을 확인해 주세요.',
          fields: { email: '형식 오류' },
          requestId: 'r1',
        },
      }),
    ).toEqual({
      code: 'E_VALIDATION',
      message: '입력값을 확인해 주세요.',
      fields: { email: '형식 오류' },
    })
  })

  it('fields 가 null 이면 null 이다', () => {
    expect(
      readApiError({
        error: {
          code: 'E_INTERNAL',
          message: 'x',
          fields: null,
          requestId: '',
        },
      })?.fields,
    ).toBeNull()
  })

  it('문자열 아닌 field 값은 버린다', () => {
    expect(
      readApiError({
        error: {
          code: 'E_VALIDATION',
          message: 'x',
          fields: { a: 1, b: 'ok' },
        },
      })?.fields,
    ).toEqual({ b: 'ok' })
  })

  it.each([null, undefined, 'text', 42, {}, { error: null }, { error: {} }])(
    '형태가 다른 %s 는 null 이다',
    (payload) => {
      expect(readApiError(payload)).toBeNull()
    },
  )
})
