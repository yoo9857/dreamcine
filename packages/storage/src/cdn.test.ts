import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { avatarUrl, cdnOrigin, cdnUrl, masterUrl, thumbUrl } from './cdn.js'

const ASSET = 'ast_ghi789'
const VARIABLES = ['CDN_BASE_URL', 'NEXT_PUBLIC_CDN_BASE_URL'] as const
const saved = new Map<string, string | undefined>()

beforeEach(() => {
  for (const name of VARIABLES) {
    saved.set(name, process.env[name])
  }
  process.env.CDN_BASE_URL = 'https://cdn.example.com'
  // 테스트마다 명시적으로 정한다. 남아 있으면 우선순위 때문에 결과가 바뀐다.
  Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_CDN_BASE_URL')
})

afterEach(() => {
  for (const [name, value] of saved) {
    if (value === undefined) {
      Reflect.deleteProperty(process.env, name)
    } else {
      process.env[name] = value
    }
  }
  saved.clear()
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

describe('cdnOrigin', () => {
  it('경로를 뺀 출처만 돌려준다', () => {
    // CSP 소스에 경로를 넣으면 접두사 규칙에 걸려 세그먼트 요청이 조용히
    // 막히는 경우가 생긴다.
    process.env.CDN_BASE_URL = 'http://127.0.0.1:9000/aidream-hls'

    expect(cdnOrigin()).toBe('http://127.0.0.1:9000')
  })

  it('경로가 없으면 그대로 출처다', () => {
    expect(cdnOrigin()).toBe('https://cdn.example.com')
  })

  it('기본 포트는 생략된다', () => {
    process.env.CDN_BASE_URL = 'https://cdn.example.com:443/x'

    expect(cdnOrigin()).toBe('https://cdn.example.com')
  })

  it('설정이 없으면 null 이다', () => {
    // 미들웨어가 매 요청 던지면 사이트 전체가 죽는다. CDN 설정 누락의 올바른
    // 증상은 "영상이 재생되지 않음" 이지 "사이트 다운" 이 아니다.
    Reflect.deleteProperty(process.env, 'CDN_BASE_URL')
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_CDN_BASE_URL')

    expect(cdnOrigin()).toBeNull()
  })

  it('빈 문자열도 없음으로 본다', () => {
    process.env.CDN_BASE_URL = ''
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_CDN_BASE_URL')

    expect(cdnOrigin()).toBeNull()
  })

  it('URL 이 아니면 null 이다 (던지지 않는다)', () => {
    process.env.CDN_BASE_URL = 'cdn.example.com'
    Reflect.deleteProperty(process.env, 'NEXT_PUBLIC_CDN_BASE_URL')

    expect(cdnOrigin()).toBeNull()
  })

  it('NEXT_PUBLIC 값이 우선한다', () => {
    // 브라우저 번들에서는 NEXT_PUBLIC_* 만 값으로 치환된다. 서버에서도 같은
    // 값을 쓰지 않으면 클라이언트와 서버가 다른 URL 을 만든다.
    process.env.NEXT_PUBLIC_CDN_BASE_URL = 'https://public.example.com'
    process.env.CDN_BASE_URL = 'https://internal.example.com'

    expect(cdnOrigin()).toBe('https://public.example.com')
    expect(cdnUrl('hls/a')).toBe('https://public.example.com/hls/a')
  })
})
