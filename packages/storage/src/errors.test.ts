import { AppError } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import { mapS3Error, withS3 } from './errors.js'

/** SDK 가 던지는 모양을 흉내낸다. 실제 이름 일치는 통합 테스트가 확인한다. */
function s3Error(name: string, httpStatusCode?: number): Error {
  const error = new Error(name)
  error.name = name
  return Object.assign(error, {
    $metadata: httpStatusCode === undefined ? {} : { httpStatusCode },
  })
}

describe('mapS3Error — T04 §6 매핑표', () => {
  it.each([
    ['AccessDenied', 'E_STORAGE_UNAVAILABLE'],
    ['InvalidAccessKeyId', 'E_STORAGE_UNAVAILABLE'],
    ['SignatureDoesNotMatch', 'E_STORAGE_UNAVAILABLE'],
    ['NoSuchBucket', 'E_STORAGE_UNAVAILABLE'],
    ['NoSuchKey', 'E_STORAGE_OBJECT_NOT_FOUND'],
    ['NotFound', 'E_STORAGE_OBJECT_NOT_FOUND'],
    ['NoSuchUpload', 'E_UPLOAD_SESSION_EXPIRED'],
    ['InvalidPart', 'E_UPLOAD_PART_MISSING'],
    ['InvalidPartOrder', 'E_UPLOAD_INVALID_PART'],
    ['EntityTooSmall', 'E_UPLOAD_INVALID_PART'],
    ['TimeoutError', 'E_STORAGE_UNAVAILABLE'],
    ['RequestTimeout', 'E_STORAGE_UNAVAILABLE'],
  ])('%s → %s', (name, code) => {
    expect(mapS3Error(s3Error(name)).code).toBe(code)
  })

  it('세션 만료와 파트 누락을 구분한다', () => {
    // 410(다시 시작) 과 409(그 파트만 재업로드) 는 사용자가 할 일이 다르다.
    expect(mapS3Error(s3Error('NoSuchUpload')).code).toBe(
      'E_UPLOAD_SESSION_EXPIRED',
    )
    expect(mapS3Error(s3Error('InvalidPart')).code).toBe(
      'E_UPLOAD_PART_MISSING',
    )
  })
})

describe('mapS3Error — 이름이 없을 때', () => {
  it('404 는 객체 없음이다', () => {
    expect(mapS3Error({ $metadata: { httpStatusCode: 404 } }).code).toBe(
      'E_STORAGE_OBJECT_NOT_FOUND',
    )
  })

  it('403 은 설정 문제로 본다', () => {
    expect(mapS3Error({ $metadata: { httpStatusCode: 403 } }).code).toBe(
      'E_STORAGE_UNAVAILABLE',
    )
  })

  it('5xx 는 스토리지 장애다', () => {
    expect(mapS3Error({ $metadata: { httpStatusCode: 503 } }).code).toBe(
      'E_STORAGE_UNAVAILABLE',
    )
    expect(mapS3Error({ $metadata: { httpStatusCode: 500 } }).code).toBe(
      'E_STORAGE_UNAVAILABLE',
    )
  })

  it('Code 필드만 와도 매핑한다', () => {
    // XML 파싱 경로에 따라 name 이 아니라 Code 로만 오는 경우가 있다.
    expect(mapS3Error({ Code: 'NoSuchKey' }).code).toBe(
      'E_STORAGE_OBJECT_NOT_FOUND',
    )
  })

  it('이름이 우선한다', () => {
    // 403 하나에 자격증명 오류와 정책 거부가 섞여 온다. 이름이 더 정확하다.
    const mapped = mapS3Error(s3Error('NoSuchKey', 403))

    expect(mapped.code).toBe('E_STORAGE_OBJECT_NOT_FOUND')
  })
})

describe('mapS3Error — 모르는 것', () => {
  it('모르는 에러는 E_INTERNAL 이다', () => {
    // E_STORAGE_UNAVAILABLE 로 보내면 503 + 재시도 가능이라, 우리 버그가
    // "일시적 스토리지 장애" 로 위장된 채 영원히 재시도된다.
    expect(mapS3Error(s3Error('SomethingNew')).code).toBe('E_INTERNAL')
    expect(mapS3Error(new Error('boom')).code).toBe('E_INTERNAL')
    expect(mapS3Error('문자열').code).toBe('E_INTERNAL')
    expect(mapS3Error(null).code).toBe('E_INTERNAL')
    expect(mapS3Error(undefined).code).toBe('E_INTERNAL')
  })

  it('4xx 중 매핑 없는 것도 E_INTERNAL 이다', () => {
    // 400 을 스토리지 장애로 보내면 재시도 루프에 갇힌다.
    expect(mapS3Error({ $metadata: { httpStatusCode: 400 } }).code).toBe(
      'E_INTERNAL',
    )
  })
})

describe('mapS3Error — 부가정보와 통과', () => {
  it('원인을 detail 에 남긴다', () => {
    const mapped = mapS3Error(s3Error('NoSuchKey', 404))

    expect(mapped.detail).toEqual({ s3Error: 'NoSuchKey', httpStatus: 404 })
  })

  it('원본 에러를 cause 로 보존한다', () => {
    const original = s3Error('NoSuchKey')

    expect(mapS3Error(original).cause).toBe(original)
  })

  it('이미 AppError 면 그대로 통과시킨다', () => {
    // 우리가 던진 파트 번호 검증 결과가 E_INTERNAL 로 뭉개지면 안 된다.
    const ours = new AppError('E_UPLOAD_INVALID_PART', { partNumber: 0 })

    expect(mapS3Error(ours)).toBe(ours)
  })
})

describe('withS3', () => {
  it('성공하면 결과를 그대로 돌려준다', async () => {
    await expect(withS3(() => Promise.resolve(42))).resolves.toBe(42)
  })

  it('실패하면 AppError 로 바꿔 던진다', async () => {
    await expect(
      withS3(() => Promise.reject(s3Error('NoSuchKey'))),
    ).rejects.toMatchObject({ code: 'E_STORAGE_OBJECT_NOT_FOUND' })
  })

  it('동기적으로 던진 것도 잡는다', async () => {
    await expect(
      withS3(() => {
        throw s3Error('NoSuchBucket')
      }),
    ).rejects.toMatchObject({ code: 'E_STORAGE_UNAVAILABLE' })
  })
})
