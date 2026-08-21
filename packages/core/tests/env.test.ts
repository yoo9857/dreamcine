import { describe, expect, it } from 'vitest'

import { loadServerEnv } from '../src/env.js'

const validEnv = {
  NODE_ENV: 'test',
  APP_URL: 'https://dream.example.com',
  CAPACITY_TIER: 'T0',
  DATABASE_URL: 'postgresql://user:password@localhost:5432/aidream',
  REDIS_URL: 'redis://localhost:6379',
  AUTH_SECRET: '12345678901234567890123456789012',
  S3_ENDPOINT: 'https://object.example.com',
  S3_REGION: 'jp-osa-1',
  S3_ACCESS_KEY_ID: 'access-key',
  S3_SECRET_ACCESS_KEY: 'secret-key',
  S3_BUCKET_ORIGINALS: 'originals',
  S3_BUCKET_HLS: 'hls',
  S3_BUCKET_THUMBS: 'thumbs',
  CDN_BASE_URL: 'https://cdn.example.com',
}

describe('loadServerEnv', () => {
  it('유효한 입력을 파싱하고 안전한 기본값을 적용한다', () => {
    const env = loadServerEnv(validEnv)

    expect(env.CAPACITY_TIER).toBe('T0')
    expect(env.WORKER_CONCURRENCY).toBe(2)
    expect(env.FFMPEG_PATH).toBe('ffmpeg')
    expect(env.LOG_LEVEL).toBe('info')
  })

  it('필수 키 누락을 거부한다', () => {
    const { DATABASE_URL: omitted, ...missingDatabaseUrl } = validEnv

    expect(omitted).toBeDefined()
    expect(() => loadServerEnv(missingDatabaseUrl)).toThrow()
  })

  it('잘못된 URL 형식을 거부한다', () => {
    expect(() => loadServerEnv({ ...validEnv, APP_URL: 'not-a-url' })).toThrow()
  })

  it('정의되지 않은 용량 티어를 거부한다', () => {
    expect(() => loadServerEnv({ ...validEnv, CAPACITY_TIER: 'T3' })).toThrow()
  })
})
