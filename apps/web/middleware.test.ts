import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { contentSecurityPolicy } from './middleware'

const VARIABLES = [
  'CDN_BASE_URL',
  'NEXT_PUBLIC_CDN_BASE_URL',
  'S3_ENDPOINT',
] as const
const saved = new Map<string, string | undefined>()
const MAP_SOURCES =
  'https://basemaps.cartocdn.com https://tiles.basemaps.cartocdn.com https://*.basemaps.cartocdn.com'

beforeEach(() => {
  for (const name of VARIABLES) saved.set(name, process.env[name])
  process.env.CDN_BASE_URL = 'https://cdn.example.com'
  Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_CDN_BASE_URL')
  process.env.S3_ENDPOINT = 'https://jp-osa-1.linodeobjects.com'
})

afterEach(() => {
  for (const [name, value] of saved) {
    if (value === undefined) Reflect.deleteProperty(process.env, name)
    else process.env[name] = value
  }
  saved.clear()
})

describe('contentSecurityPolicy', () => {
  it('직접 업로드를 위해 CDN과 별도인 S3 출처를 허용한다', () => {
    const directives = contentSecurityPolicy('test-nonce')
      .split(';')
      .map((part) => part.trim())
    const connect = directives.find((part) => part.startsWith('connect-src'))

    expect(connect).toBe(
      `connect-src 'self' https://cdn.example.com https://jp-osa-1.linodeobjects.com ${MAP_SOURCES}`,
    )
  })

  it('CDN과 S3 출처가 같으면 중복하지 않는다', () => {
    process.env.CDN_BASE_URL = 'http://127.0.0.1:9000/aidream-hls'
    process.env.S3_ENDPOINT = 'http://127.0.0.1:9000'

    const connect = contentSecurityPolicy('test-nonce')
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('connect-src'))

    expect(connect).toBe(
      `connect-src 'self' http://127.0.0.1:9000 ${MAP_SOURCES}`,
    )
  })

  it('MapLibre 워커는 same-origin만 허용한다', () => {
    expect(contentSecurityPolicy('test-nonce')).toContain("worker-src 'self'")
  })
})
