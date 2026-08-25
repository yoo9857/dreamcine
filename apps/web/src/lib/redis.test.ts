import { AppError } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import { assertSetSuccess, isSetNxSuccess, parseRedisUrl } from './redis'

describe('parseRedisUrl', () => {
  it('호스트와 포트를 읽는다', () => {
    expect(parseRedisUrl('redis://cache.internal:6380')).toEqual({
      host: 'cache.internal',
      port: 6380,
      username: undefined,
      password: undefined,
      db: undefined,
    })
  })

  it('포트를 생략하면 6379 다', () => {
    expect(parseRedisUrl('redis://127.0.0.1').port).toBe(6379)
  })

  it('자격증명과 DB 인덱스를 읽는다', () => {
    expect(parseRedisUrl('redis://user:p%40ss@127.0.0.1:6379/3')).toEqual({
      host: '127.0.0.1',
      port: 6379,
      username: 'user',
      password: 'p@ss',
      db: 3,
    })
  })

  it('비밀번호만 있는 형태도 읽는다', () => {
    const target = parseRedisUrl('redis://:secret@127.0.0.1:6379')
    expect(target.username).toBeUndefined()
    expect(target.password).toBe('secret')
  })

  it('rediss 도 허용한다', () => {
    expect(parseRedisUrl('rediss://127.0.0.1:6379').host).toBe('127.0.0.1')
  })

  it.each(['http://127.0.0.1:6379', 'postgresql://127.0.0.1:5432'])(
    '%s 는 E_QUEUE_UNAVAILABLE 이다',
    (url) => {
      expect(() => parseRedisUrl(url)).toThrow(AppError)
      try {
        parseRedisUrl(url)
      } catch (error: unknown) {
        expect(error).toMatchObject({ code: 'E_QUEUE_UNAVAILABLE' })
      }
    },
  )

  it('URL 로 파싱조차 안 되면 E_QUEUE_UNAVAILABLE 이다', () => {
    expect(() => parseRedisUrl('not a url')).toThrow(AppError)
  })
})

describe('SET NX EX reply', () => {
  it('OK는 신규 키, null은 기존 키다', () => {
    expect(isSetNxSuccess('OK')).toBe(true)
    expect(isSetNxSuccess(null)).toBe(false)
  })

  it('예상 밖 응답은 큐 오류로 거부한다', () => {
    expect(() => isSetNxSuccess(1)).toThrow(AppError)
  })
})

describe('SET EX reply', () => {
  it('OK 응답만 성공으로 인정한다', () => {
    expect(() => {
      assertSetSuccess('OK')
    }).not.toThrow()
  })

  it.each([null, 1, 'QUEUED'])(
    '예상 밖 응답 %s를 큐 오류로 거부한다',
    (reply) => {
      expect(() => {
        assertSetSuccess(reply)
      }).toThrow(AppError)
    },
  )
})
