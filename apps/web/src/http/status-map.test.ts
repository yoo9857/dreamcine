import { ERROR_CODES } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import {
  CLIENT_ONLY_ERROR_CODES,
  STATUS_MAP,
  httpStatusFor,
} from './status-map'

const clientOnly: readonly string[] = CLIENT_ONLY_ERROR_CODES

describe('STATUS_MAP', () => {
  it('클라이언트 전용 코드를 제외한 모든 코드를 담는다', () => {
    const mapped = new Set(Object.keys(STATUS_MAP))
    const expected = ERROR_CODES.filter((code) => !clientOnly.includes(code))
    expect(mapped).toEqual(new Set(expected))
  })

  it('클라이언트 전용 코드는 담지 않는다', () => {
    for (const code of CLIENT_ONLY_ERROR_CODES) {
      expect(Object.keys(STATUS_MAP)).not.toContain(code)
    }
  })

  it('모든 상태코드가 4xx 또는 5xx 다', () => {
    for (const [code, status] of Object.entries(STATUS_MAP)) {
      expect(status, code).toBeGreaterThanOrEqual(400)
      expect(status, code).toBeLessThan(600)
    }
  })

  it('09_ERROR_CATALOG 의 대표 매핑과 일치한다', () => {
    expect(STATUS_MAP.E_AUTH_REQUIRED).toBe(401)
    expect(STATUS_MAP.E_AUTH_ACCOUNT_SUSPENDED).toBe(403)
    expect(STATUS_MAP.E_AUTH_OAUTH_FAILED).toBe(502)
    expect(STATUS_MAP.E_USER_EMAIL_TAKEN).toBe(409)
    expect(STATUS_MAP.E_UPLOAD_SESSION_EXPIRED).toBe(410)
    expect(STATUS_MAP.E_UPLOAD_TOO_LARGE).toBe(413)
    expect(STATUS_MAP.E_UPLOAD_UNSUPPORTED_TYPE).toBe(415)
    expect(STATUS_MAP.E_MEDIA_DISK_FULL).toBe(507)
    expect(STATUS_MAP.E_RATE_LIMITED).toBe(429)
    expect(STATUS_MAP.E_VALIDATION).toBe(422)
    expect(STATUS_MAP.E_NOT_IMPLEMENTED).toBe(501)
  })
})

describe('httpStatusFor', () => {
  it('모든 카탈로그 코드에 상태를 돌려준다', () => {
    for (const code of ERROR_CODES) {
      expect(httpStatusFor(code), code).toBeGreaterThanOrEqual(400)
    }
  })

  it('클라이언트 전용 코드가 서버 경로에 오면 500 으로 취급한다', () => {
    for (const code of CLIENT_ONLY_ERROR_CODES) {
      expect(httpStatusFor(code)).toBe(500)
    }
  })
})
