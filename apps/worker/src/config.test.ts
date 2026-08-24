import { describe, expect, it } from 'vitest'

import { loadWorkerConfig } from './config.js'

const ENV = {
  NODE_ENV: 'test',
  APP_URL: 'http://localhost:3000',
  CAPACITY_TIER: 'T0',
  DATABASE_URL: 'postgresql://user:pass@localhost/db',
  REDIS_URL: 'redis://localhost:6379',
  AUTH_SECRET: '12345678901234567890123456789012',
  S3_ENDPOINT: 'http://localhost:9000',
  S3_REGION: 'us-east-1',
  S3_ACCESS_KEY_ID: 'key',
  S3_SECRET_ACCESS_KEY: 'secret',
  S3_BUCKET_ORIGINALS: 'originals',
  S3_BUCKET_HLS: 'hls',
  S3_BUCKET_THUMBS: 'thumbs',
  CDN_BASE_URL: 'http://localhost:9000/hls',
} satisfies NodeJS.ProcessEnv

describe('loadWorkerConfig', () => {
  it('T0 용량과 기본 worker 역할을 함께 읽는다', () => {
    expect(loadWorkerConfig(ENV)).toMatchObject({
      capacityTier: 'T0',
      processRole: 'worker',
      capacity: { workerConcurrency: 1, ladder: ['720p', '360p'] },
    })
  })

  it('잘못된 process 역할을 부팅 전에 거부한다', () => {
    expect(() => loadWorkerConfig({ ...ENV, PROCESS_ROLE: 'other' })).toThrow()
  })
})
