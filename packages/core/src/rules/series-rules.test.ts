import { AppError } from '../errors/app-error.js'
import { describe, expect, it, vi } from 'vitest'

import { ensureUniqueSlug, toSlug } from './slug.js'
import { normalizeTag } from './tag.js'

describe('toSlug', () => {
  it.each([
    ['나의 첫 드라마', '나의-첫-드라마'],
    ['Hello WORLD 2026', 'hello-world-2026'],
    ['  공백   여러 개  ', '공백-여러-개'],
    ['특수!@# 문자---정리', '특수-문자-정리'],
    ['ＡＩ 드라마', 'ai-드라마'],
  ])('%s → %s', (title, expected) => {
    expect(toSlug(title)).toBe(expected)
  })

  it('정규화 뒤 빈 결과면 안정적인 대체값을 쓴다', () => {
    expect(toSlug('!@#$')).toBe('series')
  })
})

describe('ensureUniqueSlug', () => {
  it('기본 슬러그가 비어 있으면 그대로 사용한다', async () => {
    const seen: string[] = []
    await expect(
      ensureUniqueSlug('나의-드라마', (slug) => {
        seen.push(slug)
        return Promise.resolve(false)
      }),
    ).resolves.toBe('나의-드라마')
    expect(seen).toEqual(['나의-드라마'])
  })

  it('중복이면 -2부터 비어 있는 번호를 찾는다', async () => {
    const taken = new Set(['drama', 'drama-2', 'drama-3'])
    await expect(
      ensureUniqueSlug('drama', (slug) => Promise.resolve(taken.has(slug))),
    ).resolves.toBe('drama-4')
  })

  it('100회가 모두 중복이면 6자 임의 접미를 붙여 실패시키지 않는다', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.123456789)
    await expect(
      ensureUniqueSlug('drama', () => Promise.resolve(true)),
    ).resolves.toMatch(/^drama-[a-z0-9]{6}$/u)
    random.mockRestore()
  })
})

describe('normalizeTag', () => {
  it.each([
    ['AI Drama', 'ai-drama'],
    ['  한글   태그  ', '한글-태그'],
    ['태그!!!이름', '태그이름'],
  ])('%s → %s', (tag, expected) => {
    expect(normalizeTag(tag)).toBe(expected)
  })

  it('유니코드 문자 기준 24자로 자른다', () => {
    expect(Array.from(normalizeTag('가'.repeat(30)))).toHaveLength(24)
  })

  it.each(['', '   ', '!@#$'])('빈 결과 %s를 거부한다', (tag) => {
    expect(() => normalizeTag(tag)).toThrow(AppError)
  })
})
