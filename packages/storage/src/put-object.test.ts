import { Readable } from 'node:stream'

import { afterAll, describe, expect, it } from 'vitest'

import { BUCKET } from './buckets.js'
import { IMMUTABLE_1Y } from './cache-presets.js'
import { objectAcl, putObject } from './put-object.js'

const ORIGINAL_PUBLIC_ACL = process.env.S3_PUBLIC_OBJECT_ACL

afterAll(() => {
  if (ORIGINAL_PUBLIC_ACL === undefined) {
    Reflect.deleteProperty(process.env, 'S3_PUBLIC_OBJECT_ACL')
  } else {
    process.env.S3_PUBLIC_OBJECT_ACL = ORIGINAL_PUBLIC_ACL
  }
})

describe('putObject — 객체 ACL', () => {
  it('원본에는 공개 ACL을 절대 붙이지 않는다', () => {
    process.env.S3_PUBLIC_OBJECT_ACL = 'public-read'
    expect(objectAcl(BUCKET.ORIGINALS)).toBeUndefined()
  })

  it('설정 시 HLS와 썸네일만 public-read로 저장한다', () => {
    process.env.S3_PUBLIC_OBJECT_ACL = 'public-read'
    expect(objectAcl(BUCKET.HLS)).toBe('public-read')
    expect(objectAcl(BUCKET.THUMBS)).toBe('public-read')
  })

  it('로컬 MinIO에서는 bucket policy에 맡긴다', () => {
    process.env.S3_PUBLIC_OBJECT_ACL = 'none'
    expect(objectAcl(BUCKET.HLS)).toBeUndefined()
  })
})

describe('putObject — 길이 없는 스트림', () => {
  it('스트림에 contentLength 가 없으면 호출 전에 거부한다', async () => {
    // SDK 에 맡기면 "Cannot determine length of stream" 이 호출 지점에서
    // 멀리 떨어진 곳에서 난다. 무엇이 빠졌는지 여기서 말한다.
    await expect(
      putObject({
        bucket: BUCKET.HLS,
        key: 'hls/a/master.m3u8',
        body: Readable.from(['#EXTM3U']),
        contentType: 'application/vnd.apple.mpegurl',
        cacheControl: IMMUTABLE_1Y,
      }),
    ).rejects.toMatchObject({
      code: 'E_INTERNAL',
      detail: { reason: 'stream-without-content-length' },
    })
  })

  it('어떤 키가 문제인지 알려준다', async () => {
    await expect(
      putObject({
        bucket: BUCKET.HLS,
        key: 'hls/a/1080p/seg_00001.ts',
        body: Readable.from(['x']),
        contentType: 'video/mp2t',
        cacheControl: IMMUTABLE_1Y,
      }),
    ).rejects.toMatchObject({
      detail: { key: 'hls/a/1080p/seg_00001.ts' },
    })
  })
})
