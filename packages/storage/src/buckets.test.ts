import { AppError } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import {
  BUCKET,
  avatarKey,
  hlsMasterKey,
  hlsPrefix,
  hlsRenditionKey,
  originalKey,
  sanitizeFileName,
  seriesPosterKey,
  thumbKey,
} from './buckets.js'

/** 짝을 잃은 상위 서러게이트. 잘린 이모지가 남았다는 뜻이다. */
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])/u

/** 매달린 ZWJ. 자소가 쪼개졌다는 뜻이다. */
const TRAILING_ZWJ = /\u200D$/u

const GRAPHEMES = new Intl.Segmenter('ko', { granularity: 'grapheme' })

/** 사람이 세는 방식으로 길이를 센다. */
function count(value: string): number {
  return [...GRAPHEMES.segment(value)].length
}

const USER = 'usr_abc123'
const SESSION = 'ses_def456'
const ASSET = 'ast_ghi789'

describe('sanitizeFileName — 경로 탈출', () => {
  it('상위 디렉터리 탈출을 무력화한다', () => {
    const safe = sanitizeFileName('../../etc/passwd')

    expect(safe).not.toContain('/')
    expect(safe).not.toContain('..')
    expect(safe).toBe('etcpasswd')
  })

  it('윈도우 구분자도 막는다', () => {
    const safe = sanitizeFileName('..\\..\\windows\\system32\\evil.exe')

    expect(safe).toBe('windowssystem32evil.exe')
  })

  it('점이 여러 개 이어져도 남기지 않는다', () => {
    // 한 번만 지우면 '....' 가 '..' 로 남는다. 사라질 때까지 반복해야 한다.
    expect(sanitizeFileName('....\\etc\\passwd')).not.toContain('..')
    expect(sanitizeFileName('a....b')).toBe('ab')
  })

  it('점만 남는 이름은 대체한다', () => {
    // '.' 과 '..' 는 파일명이 아니라 경로 자체를 의미한다.
    expect(sanitizeFileName('..')).toBe('upload')
    expect(sanitizeFileName('.')).toBe('upload')
    expect(sanitizeFileName('.....')).toBe('upload')
  })

  it('NULL 바이트와 제어문자를 제거한다', () => {
    expect(sanitizeFileName('evil\u0000.mp4\u0007')).toBe('evil.mp4')
  })

  it('연달아 호출해도 같은 결과를 준다', () => {
    // 전역 정규식으로 .test() 를 하면 lastIndex 때문에 두 번째가 통과한다.
    const first = sanitizeFileName('a\u0000b')
    const second = sanitizeFileName('a\u0000b')

    expect(second).toBe(first)
    expect(first).toBe('ab')
  })

  it('결과가 비면 upload 로 대체한다', () => {
    expect(sanitizeFileName('\\\\\\')).toBe('upload')
    expect(sanitizeFileName('   ')).toBe('upload')
    expect(sanitizeFileName('')).toBe('upload')
  })
})

describe('sanitizeFileName — 유니코드와 길이', () => {
  it('한글과 공백은 그대로 남긴다', () => {
    expect(sanitizeFileName('내 드라마 1화.mp4')).toBe('내 드라마 1화.mp4')
  })

  it('NFC 로 정규화한다', () => {
    // 자모 분리(NFD)로 들어온 이름이 조합형과 다른 키가 되면, 같은 파일이
    // 다른 키로 두 번 올라간다.
    const decomposed = '가'.normalize('NFD')
    expect(decomposed).not.toBe('가')

    expect(sanitizeFileName(decomposed + '.mp4')).toBe('가.mp4')
  })

  it('이모지를 반토막 내지 않는다', () => {
    // UTF-16 단위로 자르면 서러게이트 페어가 깨져 잘못된 문자가 키에 들어간다.
    const safe = sanitizeFileName('🎬'.repeat(250) + '.mp4')

    expect(safe.endsWith('.mp4')).toBe(true)
    expect(count(safe)).toBe(200)
    // 짝을 잃은 서러게이트가 남아 있지 않다.
    expect(safe).not.toMatch(LONE_SURROGATE)
  })

  it('ZWJ 로 이어진 이모지를 쪼개지 않는다', () => {
    // 코드 포인트로 자르면 가족 이모지가 쪼개져 매달린 결합자가 남는다.
    // 사람이 세는 단위는 자소다.
    const family = '👨‍👩‍👧'
    const safe = sanitizeFileName(family.repeat(250) + '.mp4')

    expect(count(safe)).toBe(200)
    expect(safe.endsWith('.mp4')).toBe(true)
    // 매달린 ZWJ 로 끝나지 않는다.
    expect(safe).not.toMatch(TRAILING_ZWJ)
  })

  it('200자를 넘으면 자르되 확장자를 보존한다', () => {
    const safe = sanitizeFileName('a'.repeat(400) + '.mp4')

    expect(count(safe)).toBe(200)
    expect(safe.endsWith('.mp4')).toBe(true)
  })

  it('확장자가 없으면 그냥 자른다', () => {
    expect(count(sanitizeFileName('b'.repeat(400)))).toBe(200)
  })

  it('확장자처럼 보이지만 너무 긴 꼬리는 본문으로 본다', () => {
    // '.' 뒤가 20자를 넘으면 확장자가 아니다. 그것을 보존하려 하면 본문이 사라진다.
    const safe = sanitizeFileName('c'.repeat(300) + '.' + 'd'.repeat(50))

    expect(count(safe)).toBe(200)
    expect(safe.startsWith('c')).toBe(true)
  })

  it('200자 이하는 손대지 않는다', () => {
    expect(sanitizeFileName('short.mp4')).toBe('short.mp4')
  })
})

describe('키 조립', () => {
  it('originalKey 는 스펙의 구조를 따른다', () => {
    expect(originalKey(USER, SESSION, 'movie.mp4')).toBe(
      'originals/usr_abc123/ses_def456/movie.mp4',
    )
  })

  it('originalKey 는 호출자가 잊어도 새니타이즈한다', () => {
    const key = originalKey(USER, SESSION, '../../../etc/passwd')

    expect(key).toBe('originals/usr_abc123/ses_def456/etcpasswd')
    expect(key.split('/')).toHaveLength(4)
  })

  it('hlsPrefix 는 슬래시로 끝난다', () => {
    // 프리픽스 삭제가 이것을 쓴다. 슬래시가 없으면 다른 assetId 까지 지운다.
    expect(hlsPrefix(ASSET)).toBe('hls/ast_ghi789/')
  })

  it('hlsMasterKey', () => {
    expect(hlsMasterKey(ASSET)).toBe('hls/ast_ghi789/master.m3u8')
  })

  it('hlsRenditionKey', () => {
    expect(hlsRenditionKey(ASSET, '1080p', 'seg_00001.ts')).toBe(
      'hls/ast_ghi789/1080p/seg_00001.ts',
    )
  })

  it('thumbKey', () => {
    expect(thumbKey(ASSET, 'thumb.jpg')).toBe('thumbs/ast_ghi789/thumb.jpg')
  })

  it('avatarKey', () => {
    expect(avatarKey(USER)).toBe('thumbs/avatars/usr_abc123.webp')
  })

  it('seriesPosterKey', () => {
    expect(seriesPosterKey('srs_x1')).toBe('thumbs/posters/series/srs_x1.webp')
    expect(seriesPosterKey('srs_x1', 'v2')).toBe(
      'thumbs/posters/series/srs_x1/v2.webp',
    )
  })

  it('논리 버킷 이름이 키 접두사와 같다', () => {
    // 키가 hls/ · thumbs/ 로 시작하는 것이 CDN 경로 라우팅의 근거다. (OBS-013)
    expect(hlsPrefix(ASSET).startsWith(BUCKET.HLS + '/')).toBe(true)
    expect(thumbKey(ASSET, 'a.jpg').startsWith(BUCKET.THUMBS + '/')).toBe(true)
    expect(
      originalKey(USER, SESSION, 'a').startsWith(BUCKET.ORIGINALS + '/'),
    ).toBe(true)
  })
})

describe('키 조각 검증', () => {
  it('id 에 경로 문자가 있으면 던진다', () => {
    // 새니타이즈로 조용히 고칠 일이 아니다 — id 를 몰래 바꾸면 잘못된 위치를
    // 정상으로 착각하게 된다.
    expect(() => originalKey('../other', SESSION, 'a.mp4')).toThrow()
    expect(() => hlsPrefix('a/b')).toThrow()
    expect(() => avatarKey('..')).toThrow()
  })

  it('빈 id 를 거부한다', () => {
    expect(() => thumbKey('', 'a.jpg')).toThrow()
    expect(() => thumbKey(ASSET, '')).toThrow()
  })

  it('제어문자가 든 id 를 거부한다', () => {
    expect(() => hlsPrefix('a\u0000b')).toThrow()
  })

  it('제어문자 검사는 연달아 호출해도 거부한다', () => {
    // 전역 정규식(/g)으로 .test() 를 하면 lastIndex 가 남아 두 번째 호출이
    // 조용히 통과한다. 그러면 같은 요청 안에서 두 번째 키부터 검사가 풀린다.
    expect(() => hlsPrefix('a\u0000b')).toThrow()
    expect(() => hlsPrefix('a\u0000b')).toThrow()
    expect(() => hlsPrefix('c\u0000d')).toThrow()
  })

  it('E_INTERNAL 로 던진다', () => {
    // 사용자 잘못이 아니라 우리 잘못이다. 400 이 아니라 알럿이 울려야 한다.
    let caught: unknown
    try {
      hlsPrefix('a/b')
    } catch (error: unknown) {
      caught = error
    }

    expect(caught).toBeInstanceOf(AppError)
    expect((caught as AppError).code).toBe('E_INTERNAL')
  })
})
