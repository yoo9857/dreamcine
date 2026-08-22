import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { avatarUrl, cdnUrl, masterUrl, thumbUrl } from './cdn.js'

const ASSET = 'ast_ghi789'
let saved: string | undefined

beforeEach(() => {
  saved = process.env.CDN_BASE_URL
  process.env.CDN_BASE_URL = 'https://cdn.example.com'
})

afterEach(() => {
  if (saved === undefined) {
    Reflect.deleteProperty(process.env, 'CDN_BASE_URL')
  } else {
    process.env.CDN_BASE_URL = saved
  }
})

describe('cdnUrl', () => {
  it('base 와 키를 잇는다', () => {
    expect(cdnUrl('hls/a/master.m3u8')).toBe(
      'https://cdn.example.com/hls/a/master.m3u8',
    )
  })

  it('base 끝 슬래시를 중복시키지 않는다', () => {
    process.env.CDN_BASE_URL = 'https://cdn.example.com/'

    expect(cdnUrl('hls/a/master.m3u8')).toBe(
      'https://cdn.example.com/hls/a/master.m3u8',
    )
  })

  it('base 끝 슬래시가 여러 개여도 하나로 만든다', () => {
    process.env.CDN_BASE_URL = 'https://cdn.example.com///'

    expect(cdnUrl('hls/a')).toBe('https://cdn.example.com/hls/a')
  })

  it('키 앞 슬래시를 흡수한다', () => {
    // S3 에서 'a//b' 와 'a/b' 는 다른 키다. // 가 생기면 404 가 된다.
    expect(cdnUrl('/hls/a')).toBe('https://cdn.example.com/hls/a')
  })

  it('양쪽에 슬래시가 있어도 하나만 남는다', () => {
    process.env.CDN_BASE_URL = 'https://cdn.example.com/'

    expect(cdnUrl('/hls/a')).toBe('https://cdn.example.com/hls/a')
  })

  it('경로가 있는 base 도 보존한다', () => {
    // 개발/CI 는 MinIO 버킷 경로를 base 에 담는다. (OBS-013)
    process.env.CDN_BASE_URL = 'http://127.0.0.1:9000/aidream-hls'

    expect(cdnUrl('hls/a/master.m3u8')).toBe(
      'http://127.0.0.1:9000/aidream-hls/hls/a/master.m3u8',
    )
  })

  it('키 중간의 슬래시는 건드리지 않는다', () => {
    expect(cdnUrl('hls/a/1080p/seg_00001.ts')).toBe(
      'https://cdn.example.com/hls/a/1080p/seg_00001.ts',
    )
  })

  it('base 가 URL 이 아니면 거부한다', () => {
    process.env.CDN_BASE_URL = 'cdn.example.com'

    expect(() => cdnUrl('hls/a')).toThrow()
  })

  it('base 가 없으면 거부한다', () => {
    Reflect.deleteProperty(process.env, 'CDN_BASE_URL')

    expect(() => cdnUrl('hls/a')).toThrow()
  })
})

describe('masterUrl / thumbUrl', () => {
  it('masterUrl 은 스펙의 경로를 만든다', () => {
    expect(masterUrl(ASSET)).toBe(
      'https://cdn.example.com/hls/ast_ghi789/master.m3u8',
    )
  })

  it('thumbUrl 은 기본 파일이 thumb.jpg 다', () => {
    expect(thumbUrl(ASSET)).toBe(
      'https://cdn.example.com/thumbs/ast_ghi789/thumb.jpg',
    )
  })

  it('thumbUrl 은 파일명을 받는다', () => {
    expect(thumbUrl(ASSET, 'poster.jpg')).toBe(
      'https://cdn.example.com/thumbs/ast_ghi789/poster.jpg',
    )
    expect(thumbUrl(ASSET, 'sprite.vtt')).toBe(
      'https://cdn.example.com/thumbs/ast_ghi789/sprite.vtt',
    )
  })

  it('assetId 에 경로 문자가 있으면 던진다', () => {
    // 키 조립 검증을 거치므로 CDN URL 로도 탈출할 수 없다.
    expect(() => masterUrl('../other')).toThrow()
    expect(() => thumbUrl('a/b')).toThrow()
  })
})

describe('avatarUrl', () => {
  it('저장된 키로 URL 을 만든다', () => {
    expect(avatarUrl('thumbs/avatars/usr_1.webp')).toBe(
      'https://cdn.example.com/thumbs/avatars/usr_1.webp',
    )
  })

  it('키가 없으면 null 이다', () => {
    // 존재하지 않는 기본 이미지를 가리키면 UI 의 이니셜 폴백이 죽고
    // 깨진 이미지가 남는다. 없음은 없음으로 전달한다.
    expect(avatarUrl(null)).toBeNull()
  })

  it('빈 문자열도 없음으로 본다', () => {
    expect(avatarUrl('')).toBeNull()
  })
})
