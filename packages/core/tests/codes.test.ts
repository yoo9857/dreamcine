import { describe, expect, it } from 'vitest'

import { ERROR_CODES } from '../src/errors/codes.js'

describe('ERROR_CODES', () => {
  it('중복 코드가 없다', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length)
  })

  it('카탈로그의 센티넬과 클라이언트 코드를 포함한다', () => {
    expect(ERROR_CODES).toContain('E_NOT_IMPLEMENTED')
    expect(ERROR_CODES).toContain('E_OFFLINE')
    expect(ERROR_CODES).toContain('E_PLAYER_MANIFEST_ERROR')
  })
})
