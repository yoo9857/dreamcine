import { describe, expect, it } from 'vitest'
import { ZodError, z } from 'zod'

import { parseBody, parseQuery } from './parse'

const BodySchema = z.object({ title: z.string().min(1), count: z.number() })
const QuerySchema = z.object({
  type: z.enum(['popular', 'latest']),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
})

describe('parseBody', () => {
  it('스키마를 통과한 값을 돌려준다', () => {
    expect(parseBody(BodySchema, { title: 'a', count: 1 })).toEqual({
      title: 'a',
      count: 1,
    })
  })

  it('ZodError 를 그대로 올린다', () => {
    expect(() => parseBody(BodySchema, { title: '', count: 'x' })).toThrow(
      ZodError,
    )
  })

  it('undefined 도 스키마 판정에 맡긴다', () => {
    expect(() => parseBody(BodySchema, undefined)).toThrow(ZodError)
  })
})

describe('parseQuery', () => {
  it('단일 값을 문자열로 넘긴다', () => {
    const query = new URLSearchParams('type=popular&limit=30')
    expect(parseQuery(QuerySchema, query)).toEqual({
      type: 'popular',
      limit: 30,
    })
  })

  it('같은 키가 여러 번 오면 배열로 넘긴다', () => {
    const query = new URLSearchParams('type=latest&tags=a&tags=b')
    expect(parseQuery(QuerySchema, query)).toEqual({
      type: 'latest',
      limit: 20,
      tags: ['a', 'b'],
    })
  })

  it('값 없는 키는 빈 문자열이 된다', () => {
    const query = new URLSearchParams('type=')
    expect(() => parseQuery(QuerySchema, query)).toThrow(ZodError)
  })
})
