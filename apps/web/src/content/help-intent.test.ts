import { describe, expect, it } from 'vitest'

import { matchServiceHelpEntry } from './help-intent'

describe('service question intent', () => {
  it.each([
    ['크리에이터 어디서지원해?', 'creator-apply'],
    ['THREAD 같은 영화 만드는 크리에이터 어디서 지원해?', 'creator-apply'],
    ['크리에디터 어디서 지원해요', 'creator-apply'],
    ['크리에이터로 지원하려면 어떻게 해야 돼?', 'creator-apply'],
    ['작가 신청 어디서 하나요?', 'creator-apply'],
    ['감독으로 지원하고 싶은데', 'creator-apply'],
    ['어디서 지원하나요', 'creator-apply'],
    ['지원은 어디에서 해?', 'creator-apply'],
    ['작가 되는 법 알려줘', 'creator-apply'],
    ['크리에이터 모집 중이야?', 'creator-apply'],
    ['지원서 작성은 어디서 하나요', 'creator-form'],
    ['지원서에 뭘 적어요?', 'creator-form'],
    ['지원 내용 수정할 수 있어?', 'creator-edit'],
    ['다시 지원해도 돼?', 'creator-edit'],
    ['경력 없어도 신청 가능?', 'creator-eligibility'],
    ['지원 분야가 뭐야?', 'creator-tracks'],
    ['포트폴리오 파일 첨부해?', 'creator-portfolio'],
    ['내 지원 결과 어디서 봐?', 'creator-status'],
    ['비번 까먹었어', 'password-reset'],
    ['영상 재생 안되는데?', 'playback-error'],
    ['영화 어디서 봐?', 'works'],
    ['고객지원 어디서 문의해?', 'support'],
  ])('classifies %s as %s', (message, expected) => {
    expect(matchServiceHelpEntry(message)?.entry?.id).toBe(expected)
  })

  it.each([
    'Horror 작가 누구야?',
    'hanbin9857 작가 소개',
    '“지원” 영화 소개',
    'THREAD 영상 어디서 봐?',
    '홍길동 작가 작품 알려줘',
    '지원 작가 소개',
  ])('preserves named catalog questions: %s', (message) => {
    expect(matchServiceHelpEntry(message)).toBeNull()
  })
})
