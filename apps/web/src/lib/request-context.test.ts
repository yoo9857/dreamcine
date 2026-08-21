import { describe, expect, it } from 'vitest'

import {
  getRequestContext,
  runWithRequestContext,
  setContextUserId,
} from './request-context'

const BASE = { requestId: 'r1', method: 'GET', path: '/api/me' }

describe('request context', () => {
  it('컨텍스트 밖에서는 undefined 다', () => {
    expect(getRequestContext()).toBeUndefined()
  })

  it('컨텍스트 안에서 같은 값을 돌려준다', () => {
    runWithRequestContext({ ...BASE }, () => {
      expect(getRequestContext()?.requestId).toBe('r1')
    })
  })

  it('await 를 건너도 유지된다', async () => {
    await runWithRequestContext({ ...BASE }, async () => {
      await Promise.resolve()
      expect(getRequestContext()?.path).toBe('/api/me')
    })
  })

  it('중첩 컨텍스트가 서로 섞이지 않는다', () => {
    runWithRequestContext({ ...BASE, requestId: 'outer' }, () => {
      runWithRequestContext({ ...BASE, requestId: 'inner' }, () => {
        expect(getRequestContext()?.requestId).toBe('inner')
      })
      expect(getRequestContext()?.requestId).toBe('outer')
    })
  })

  it('setContextUserId 가 같은 요청의 컨텍스트를 채운다', () => {
    runWithRequestContext({ ...BASE }, () => {
      expect(getRequestContext()?.userId).toBeUndefined()
      setContextUserId('user_1')
      expect(getRequestContext()?.userId).toBe('user_1')
    })
  })

  it('컨텍스트 밖에서 setContextUserId 를 불러도 던지지 않는다', () => {
    expect(() => {
      setContextUserId('user_1')
    }).not.toThrow()
  })
})
