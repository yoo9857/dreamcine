import { describe, expect, it } from 'vitest'

import { HIGGSFIELD_FILMS } from './higgsfield'
import { HELP_FALLBACK_ANSWER, matchHelpEntry } from './help-qa'

describe('help qa', () => {
  it.each([
    ['비밀번호를 잊었어요', 'password-reset'],
    ['영상이 안 나와요', 'playback-error'],
    ['접수됐나요?', 'creator-status'],
    ['지원 어떻게 해요?', 'creator-apply'],
    ['결제 실패했어요', 'billing-help'],
    ['환불하고 싶어요', 'billing-help'],
  ])('routes %s to the appropriate help topic', (question, topic) => {
    expect(matchHelpEntry(question).entry?.id).toBe(topic)
  })
  it('answers site questions from the written guide', () => {
    const eligibility = matchHelpEntry('경력이 없어도 지원할 수 있나요?')
    expect(eligibility.entry?.id).toBe('creator-eligibility')
    expect(eligibility.entry?.answer).toContain(
      '국적·경력·학력 제한은 없습니다',
    )

    const portfolio = matchHelpEntry('포트폴리오는 파일로 내나요?')
    expect(portfolio.entry?.id).toBe('creator-portfolio')
    expect(portfolio.entry?.answer).toContain('파일 첨부는 필요하지 않습니다')

    const works = matchHelpEntry('숏폼은 어떻게 보이나요?')
    expect(works.entry?.id).toBe('works')
    expect(works.entry?.answer).toContain('9:16')

    const price = matchHelpEntry('멤버십 요금이 얼마인가요?')
    expect(price.entry?.id).toBe('membership')
    expect(price.entry?.answer).toContain('6,900원')

    const higgsfield = matchHelpEntry('힉스필드 작품 어디서 봐요?')
    expect(higgsfield.entry?.id).toBe('higgsfield')
    for (const film of HIGGSFIELD_FILMS) {
      expect(higgsfield.entry?.answer).toContain(film.title)
    }
    expect(higgsfield.entry?.answer).not.toContain('조회')
  })

  it.each([
    '내 등급은 어떻게 올려요?',
    '브론즈가 뭐예요?',
    'BRONZE 등급 기준 알려줘',
    '멤버십 등급은 어떻게 정해져요?',
    '활동 점수는 뭘로 계산해요?',
  ])('answers %s with the creator tier guide', (question) => {
    const match = matchHelpEntry(question)
    expect(match.entry?.id).toBe('creator-tier')
    expect(match.entry?.href).toBe('/account/tier')
    expect(match.entry?.answer).toContain('BRONZE 0점')
    expect(match.entry?.answer).toContain('DIAMOND 100,000점')
  })

  it.each(['관람 등급은 어떻게 돼요?', '연령 등급 기준이 뭐예요?'])(
    'does not answer %s with the creator tier guide',
    (question) => {
      expect(matchHelpEntry(question).entry?.id).not.toBe('creator-tier')
    },
  )

  it('sends an uncovered question to support', () => {
    const match = matchHelpEntry('비트코인 시세 알려줘')
    expect(match.entry).toBeNull()
    expect(HELP_FALLBACK_ANSWER).toContain('support@ilog.kr')
  })
})
