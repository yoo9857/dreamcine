import { describe, expect, it } from 'vitest'

import { CreateCreatorApplicationSchema } from './creator-application.schema.js'

const validApplication = {
  displayName: '  김로그  ',
  email: 'CREATOR@EXAMPLE.COM',
  track: 'DIRECTOR',
  portfolioUrl: 'https://example.com/portfolio',
  socialUrl: '',
  experience: '',
  pitch:
    '기억을 사고파는 도시에서 자신의 마지막 기억을 지키려는 인물의 이야기를 만들고 싶습니다.',
  privacyConsent: true,
} as const

describe('CreateCreatorApplicationSchema', () => {
  it('지원 분야 없이 유입 경로만으로 접수한다', () => {
    const input = { ...validApplication, track: undefined }
    const parsed = CreateCreatorApplicationSchema.parse({
      ...input,
      referralSource: 'INSTAGRAM',
    })
    expect(parsed.track).toBeUndefined()
    expect(parsed.referralSource).toBe('INSTAGRAM')
  })

  it('유입 경로 누락과 알 수 없는 값은 거부한다', () => {
    const input = { ...validApplication, track: undefined }
    expect(CreateCreatorApplicationSchema.safeParse(input).success).toBe(false)
    expect(
      CreateCreatorApplicationSchema.safeParse({
        ...input,
        referralSource: 'FAKE_SOCIAL',
      }).success,
    ).toBe(false)
  })
  it('지원 내용을 정규화하고 빈 선택 항목을 제거한다', () => {
    expect(CreateCreatorApplicationSchema.parse(validApplication)).toEqual({
      ...validApplication,
      displayName: '김로그',
      email: 'creator@example.com',
      socialUrl: undefined,
      experience: undefined,
    })
  })

  it('외부 프로토콜과 짧은 피치를 거부한다', () => {
    expect(
      CreateCreatorApplicationSchema.safeParse({
        ...validApplication,
        portfolioUrl: 'javascript:alert(1)',
        pitch: '짧은 소개',
      }).success,
    ).toBe(false)
  })

  it('대표 링크와 추가 작품 링크 2개를 함께 검증하고 보존한다', () => {
    const additionalPortfolioUrls = [
      'https://vimeo.com/123',
      'https://example.com/film',
    ]
    expect(
      CreateCreatorApplicationSchema.parse({
        ...validApplication,
        additionalPortfolioUrls,
      }).additionalPortfolioUrls,
    ).toEqual(additionalPortfolioUrls)
  })

  it.each([
    ['https://example.com/1', 'https://example.com/2', 'https://example.com/3'],
    ['javascript:alert(1)'],
    ['https://example.com/' + 'a'.repeat(500)],
  ])(
    '추가 작품 링크의 개수·프로토콜·길이를 제한한다: %s',
    (...additionalPortfolioUrls) => {
      expect(
        CreateCreatorApplicationSchema.safeParse({
          ...validApplication,
          additionalPortfolioUrls,
        }).success,
      ).toBe(false)
    },
  )

  it('개인정보 동의가 없으면 거부한다', () => {
    expect(
      CreateCreatorApplicationSchema.safeParse({
        ...validApplication,
        privacyConsent: false,
      }).success,
    ).toBe(false)
  })

  it('자동 입력 봇의 숨은 필드를 거부한다', () => {
    expect(
      CreateCreatorApplicationSchema.safeParse({
        ...validApplication,
        companyWebsite: 'https://spam.example.com',
      }).success,
    ).toBe(false)
  })
})
