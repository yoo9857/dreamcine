import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BUCKET } from './buckets.js'
import { resetS3Clients } from './client.js'
import {
  PRESIGN_GET_ORIGINAL_TTL_SEC,
  PRESIGN_MAX_TTL_SEC,
  PRESIGN_PART_TTL_SEC,
  assertTtl,
  presignGet,
} from './presign.js'

const S3_ENV = {
  S3_ENDPOINT: 'http://127.0.0.1:9000',
  S3_REGION: 'us-east-1',
  S3_ACCESS_KEY_ID: 'aidream-local',
  S3_SECRET_ACCESS_KEY: 'aidream-local-secret',
  S3_BUCKET_ORIGINALS: 'aidream-originals',
  S3_BUCKET_HLS: 'aidream-hls',
  S3_BUCKET_THUMBS: 'aidream-thumbs',
} as const

const saved = new Map<string, string | undefined>()

beforeEach(() => {
  for (const [key, value] of Object.entries(S3_ENV)) {
    saved.set(key, process.env[key])
    process.env[key] = value
  }
})

afterEach(() => {
  resetS3Clients()
  for (const [key, value] of saved) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, key)
    } else {
      process.env[key] = value
    }
  }
  saved.clear()
})

describe('TTL 상수', () => {
  it('원본 다운로드는 15분이다', () => {
    // 07_AUTH_SECURITY §4 — 원본은 워커만 보고, 짧게 준다.
    expect(PRESIGN_GET_ORIGINAL_TTL_SEC).toBe(15 * 60)
  })

  it('파트 PUT 은 한도 계약에서 파생된다', () => {
    // 6시간을 리터럴로 박으면 LIMITS 와 갈라진다.
    expect(PRESIGN_PART_TTL_SEC).toBe(6 * 60 * 60)
  })

  it('상한은 SigV4 규격의 7일이다', () => {
    expect(PRESIGN_MAX_TTL_SEC).toBe(604_800)
  })
})

describe('assertTtl', () => {
  it('정상 값을 통과시킨다', () => {
    expect(assertTtl(60)).toBe(60)
    expect(assertTtl(PRESIGN_MAX_TTL_SEC)).toBe(PRESIGN_MAX_TTL_SEC)
  })

  it('7일을 넘으면 거부한다', () => {
    // SDK 는 조용히 URL 을 만들어 주고, 실패는 사용자가 그 URL 을 쓸 때
    // 서명 오류로 나타난다. 여기서 막아야 원인이 보인다.
    expect(() => assertTtl(PRESIGN_MAX_TTL_SEC + 1)).toThrow(
      expect.objectContaining({ code: 'E_INTERNAL' }) as Error,
    )
  })

  it('0 과 음수를 거부한다', () => {
    expect(() => assertTtl(0)).toThrow()
    expect(() => assertTtl(-1)).toThrow()
  })

  it('정수가 아닌 값을 거부한다', () => {
    expect(() => assertTtl(1.5)).toThrow()
    expect(() => assertTtl(Number.NaN)).toThrow()
  })
})

describe('presignGet', () => {
  // SigV4 서명은 로컬 계산이다 — 네트워크를 타지 않으므로 실제 URL 을 본다.

  it('서명 파라미터가 모두 붙는다', async () => {
    const { url } = await presignGet(
      BUCKET.ORIGINALS,
      'originals/u/s/movie.mp4',
      900,
    )
    const parsed = new URL(url)

    expect(parsed.searchParams.get('X-Amz-Algorithm')).toBe('AWS4-HMAC-SHA256')
    expect(parsed.searchParams.get('X-Amz-Expires')).toBe('900')
    expect(parsed.searchParams.get('X-Amz-Signature')).toMatch(
      /^[0-9a-f]{64}$/u,
    )
    expect(parsed.searchParams.get('X-Amz-Credential')).toContain(
      'aidream-local',
    )
  })

  it('path-style 경로로 만든다', async () => {
    // forcePathStyle 이 켜져 있어야 MinIO 와 Linode 가 같은 모양이 된다.
    const { url } = await presignGet(BUCKET.HLS, 'hls/a/master.m3u8', 60)

    expect(new URL(url).pathname).toBe('/aidream-hls/hls/a/master.m3u8')
  })

  it('버킷마다 다른 실제 이름을 쓴다', async () => {
    const originals = await presignGet(BUCKET.ORIGINALS, 'k', 60)
    const thumbs = await presignGet(BUCKET.THUMBS, 'k', 60)

    expect(new URL(originals.url).pathname).toBe('/aidream-originals/k')
    expect(new URL(thumbs.url).pathname).toBe('/aidream-thumbs/k')
  })

  it('키의 특수문자를 인코딩한다', async () => {
    // 공백이나 한글이 그대로 들어가면 서명이 깨진다.
    const { url } = await presignGet(
      BUCKET.ORIGINALS,
      'originals/u/s/내 영상 1화.mp4',
      60,
    )

    expect(url).not.toContain(' ')
    expect(new URL(url).pathname).toContain('%20')
  })

  it('expiresAt 을 함께 준다', async () => {
    const before = Date.now()
    const { expiresAt } = await presignGet(BUCKET.ORIGINALS, 'k', 900)

    // 클라이언트가 만료를 추측하지 않아도 되게 계산해서 준다.
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 900_000)
    expect(expiresAt.getTime()).toBeLessThan(before + 901_000)
  })

  it('잘못된 TTL 은 URL 을 만들지 않는다', async () => {
    await expect(presignGet(BUCKET.ORIGINALS, 'k', 0)).rejects.toMatchObject({
      code: 'E_INTERNAL',
    })
  })
})
