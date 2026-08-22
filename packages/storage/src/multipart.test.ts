import { LIMITS } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import {
  MAX_PARTS_PER_SIGN,
  assertPartNumbers,
  normalizeETag,
  sortParts,
} from './multipart.js'

describe('normalizeETag', () => {
  it('인용부호가 없으면 붙인다', () => {
    expect(normalizeETag('abc123')).toBe('"abc123"')
  })

  it('한 겹이면 그대로 한 겹이다', () => {
    expect(normalizeETag('"abc123"')).toBe('"abc123"')
  })

  it('두 겹으로 온 것도 한 겹으로 만든다', () => {
    // 클라이언트가 헤더 값을 그대로 JSON 에 넣으면 이렇게 온다.
    expect(normalizeETag('""abc123""')).toBe('"abc123"')
  })

  it('앞뒤 공백을 제거한다', () => {
    expect(normalizeETag('  "abc123"  ')).toBe('"abc123"')
  })

  it('멀티파트 ETag 의 하이픈을 보존한다', () => {
    // 멀티파트 결과 ETag 는 '{md5}-{partCount}' 모양이다.
    expect(normalizeETag('d41d8cd98f00b204e9800998ecf8427e-3')).toBe(
      '"d41d8cd98f00b204e9800998ecf8427e-3"',
    )
  })

  it('빈 값은 파트 누락으로 본다', () => {
    // 인용부호만 온 것은 값이 없다는 뜻이다. 그대로 보내면 InvalidPart 다.
    expect(() => normalizeETag('""')).toThrow(
      expect.objectContaining({ code: 'E_UPLOAD_PART_MISSING' }) as Error,
    )
    expect(() => normalizeETag('')).toThrow()
    expect(() => normalizeETag('   ')).toThrow()
  })
})

describe('assertPartNumbers', () => {
  it('정상 목록을 그대로 돌려준다', () => {
    expect(assertPartNumbers([1, 2, 3], MAX_PARTS_PER_SIGN)).toEqual([1, 2, 3])
  })

  it('빈 목록을 거부한다', () => {
    expect(() => assertPartNumbers([], MAX_PARTS_PER_SIGN)).toThrow(
      expect.objectContaining({ code: 'E_UPLOAD_INVALID_PART' }) as Error,
    )
  })

  it('서명은 100개까지다', () => {
    const hundred = Array.from({ length: 100 }, (_, index) => index + 1)

    expect(() => assertPartNumbers(hundred, MAX_PARTS_PER_SIGN)).not.toThrow()
    expect(() =>
      assertPartNumbers([...hundred, 101], MAX_PARTS_PER_SIGN),
    ).toThrow()
  })

  it('완료는 전체 파트를 허용한다', () => {
    // 서명 상한(100)을 완료에도 적용하면 큰 파일을 완료할 수 없다.
    const many = Array.from({ length: 500 }, (_, index) => index + 1)

    expect(() => assertPartNumbers(many, LIMITS.PART_COUNT_MAX)).not.toThrow()
  })

  it('0 과 음수를 거부한다', () => {
    // S3 파트 번호는 1부터다.
    expect(() => assertPartNumbers([0], LIMITS.PART_COUNT_MAX)).toThrow()
    expect(() => assertPartNumbers([-1], LIMITS.PART_COUNT_MAX)).toThrow()
  })

  it('규격 상한을 넘는 번호를 거부한다', () => {
    expect(() =>
      assertPartNumbers([LIMITS.PART_COUNT_MAX], LIMITS.PART_COUNT_MAX),
    ).not.toThrow()
    expect(() =>
      assertPartNumbers([LIMITS.PART_COUNT_MAX + 1], LIMITS.PART_COUNT_MAX),
    ).toThrow()
  })

  it('정수가 아닌 번호를 거부한다', () => {
    expect(() => assertPartNumbers([1.5], LIMITS.PART_COUNT_MAX)).toThrow()
    expect(() =>
      assertPartNumbers([Number.NaN], LIMITS.PART_COUNT_MAX),
    ).toThrow()
    expect(() =>
      assertPartNumbers([Number.POSITIVE_INFINITY], LIMITS.PART_COUNT_MAX),
    ).toThrow()
  })

  it('중복 번호를 거부한다', () => {
    // 같은 번호를 두 번 완료하면 S3 가 하나를 조용히 버린다.
    expect(() => assertPartNumbers([1, 2, 2], LIMITS.PART_COUNT_MAX)).toThrow(
      expect.objectContaining({ code: 'E_UPLOAD_INVALID_PART' }) as Error,
    )
  })

  it('어느 번호가 문제인지 알려준다', () => {
    let caught: unknown
    try {
      assertPartNumbers([1, 0, 3], LIMITS.PART_COUNT_MAX)
    } catch (error: unknown) {
      caught = error
    }

    expect(
      (caught as { detail?: Record<string, unknown> }).detail,
    ).toMatchObject({ partNumber: 0 })
  })
})

describe('sortParts', () => {
  it('번호 순으로 정렬한다', () => {
    // S3 는 순서대로 받아야 한다. 뒤섞여 오면 InvalidPartOrder 다.
    const sorted = sortParts([
      { partNumber: 3, etag: 'c' },
      { partNumber: 1, etag: 'a' },
      { partNumber: 2, etag: 'b' },
    ])

    expect(sorted.map((part) => part.partNumber)).toEqual([1, 2, 3])
  })

  it('원본 배열을 바꾸지 않는다', () => {
    const original = [
      { partNumber: 2, etag: 'b' },
      { partNumber: 1, etag: 'a' },
    ]
    sortParts(original)

    expect(original[0]?.partNumber).toBe(2)
  })

  it('두 자리 이상도 숫자로 비교한다', () => {
    // 문자열 정렬이면 10 이 2 앞에 온다.
    const sorted = sortParts([
      { partNumber: 10, etag: 'j' },
      { partNumber: 2, etag: 'b' },
    ])

    expect(sorted.map((part) => part.partNumber)).toEqual([2, 10])
  })
})
