import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { BUCKET } from './buckets.js'
import {
  bucketName,
  buildS3Config,
  resetS3Clients,
  s3,
  s3Streaming,
} from './client.js'

const S3_ENV = {
  S3_ENDPOINT: 'http://127.0.0.1:9000',
  S3_REGION: 'us-east-1',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
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

/** `requestHandler` 는 옵션 객체로 넘긴다 — 그 모양을 확인하기 위한 좁힘. */
function handlerOf(config: ReturnType<typeof buildS3Config>): {
  connectionTimeout?: number
  requestTimeout?: number
} {
  return config.requestHandler as {
    connectionTimeout?: number
    requestTimeout?: number
  }
}

describe('buildS3Config', () => {
  it('일반 클라이언트는 요청 타임아웃을 가진다', () => {
    expect(handlerOf(buildS3Config('default')).requestTimeout).toBe(30_000)
  })

  it('스트리밍 클라이언트는 요청 타임아웃이 없다', () => {
    // 30초 타임아웃으로 원본을 내려받으면 20분 영상에서 끊긴다.
    // 큰 파일에서만 실패하는 버그가 되므로 여기서 고정한다. (T04 §6)
    expect(handlerOf(buildS3Config('streaming')).requestTimeout).toBeUndefined()
  })

  it('두 모드 모두 연결 타임아웃은 가진다', () => {
    // 연결이 안 되는 것은 빠르게 포기해야 한다 — 스트리밍도 예외가 아니다.
    expect(handlerOf(buildS3Config('default')).connectionTimeout).toBe(5_000)
    expect(handlerOf(buildS3Config('streaming')).connectionTimeout).toBe(5_000)
  })

  it('재시도는 3회다', () => {
    expect(buildS3Config('default').maxAttempts).toBe(3)
  })

  it('path-style 을 강제한다', () => {
    // MinIO 는 path-style 을 요구하고 Linode 는 둘 다 지원한다. 켜 두면
    // 개발·CI·프로덕션이 같은 방식으로 말한다.
    expect(buildS3Config('default').forcePathStyle).toBe(true)
  })

  it('env 에서 엔드포인트와 자격증명을 읽는다', () => {
    const config = buildS3Config('default')

    expect(config.endpoint).toBe('http://127.0.0.1:9000')
    expect(config.region).toBe('us-east-1')
    expect(config.credentials).toEqual({
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    })
  })

  it('엔드포인트가 URL 이 아니면 거부한다', () => {
    process.env.S3_ENDPOINT = 'not-a-url'

    expect(() => buildS3Config('default')).toThrow()
  })

  it('자격증명이 비어 있으면 거부한다', () => {
    // 빈 문자열로 조용히 만들어지면 403 이 런타임에 터진다.
    process.env.S3_ACCESS_KEY_ID = ''

    expect(() => buildS3Config('default')).toThrow()
  })
})

describe('s3 / s3Streaming', () => {
  it('같은 모드는 인스턴스를 재사용한다', () => {
    // 요청마다 새로 만들면 커넥션 풀이 쌓인다.
    expect(s3()).toBe(s3())
  })

  it('스트리밍은 별도 인스턴스다', () => {
    expect(s3Streaming()).not.toBe(s3())
  })
})

describe('bucketName', () => {
  it('논리 이름을 env 의 실제 이름으로 바꾼다', () => {
    expect(bucketName(BUCKET.ORIGINALS)).toBe('aidream-originals')
    expect(bucketName(BUCKET.HLS)).toBe('aidream-hls')
    expect(bucketName(BUCKET.THUMBS)).toBe('aidream-thumbs')
  })

  it('버킷마다 다른 env 를 읽는다', () => {
    // 한 변수를 세 곳에서 읽는 실수는 조용히 데이터를 엉뚱한 버킷에 쓴다.
    process.env.S3_BUCKET_HLS = 'other-hls'

    expect(bucketName(BUCKET.HLS)).toBe('other-hls')
    expect(bucketName(BUCKET.THUMBS)).toBe('aidream-thumbs')
  })

  it('env 가 없으면 거부한다', () => {
    Reflect.deleteProperty(process.env, 'S3_BUCKET_THUMBS')

    expect(() => bucketName(BUCKET.THUMBS)).toThrow()
  })
})
