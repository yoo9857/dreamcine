import { describe, expect, it } from 'vitest'

import { NotImplementedError } from '../src/errors/not-implemented.js'

describe('NotImplementedError', () => {
  it('센티넬 코드와 마커 및 메시지를 보존한다', () => {
    const Sentinel = NotImplementedError
    const error = new Sentinel('T00:sample')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('NotImplementedError')
    expect(error.code).toBe('E_NOT_IMPLEMENTED')
    expect(error.marker).toBe('T00:sample')
    expect(error.message).toBe('[SSS:S2] not implemented yet: T00:sample')
  })
})
