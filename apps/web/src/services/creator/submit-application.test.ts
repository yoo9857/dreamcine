import { describe, expect, it, vi } from 'vitest'

import { submitCreatorApplication } from './submit-application'

const input = {
  displayName: '김로그',
  email: 'creator@example.com',
  track: 'AI_VISUAL',
  portfolioUrl: 'https://example.com/portfolio',
  pitch:
    '기억을 사고파는 도시에서 자신의 마지막 기억을 지키려는 인물의 이야기를 만들고 싶습니다.',
  privacyConsent: true,
} as const

describe('submitCreatorApplication', () => {
  it('검증된 입력과 동일한 접수 시각을 저장소에 전달한다', async () => {
    const now = new Date('2026-08-26T08:00:00.000Z')
    const record = {
      id: 'creator_application_1',
      email: input.email,
      track: input.track,
      status: 'SUBMITTED' as const,
      createdAt: now,
      updatedAt: now,
    }
    const save = vi.fn().mockResolvedValue(record)

    await expect(
      submitCreatorApplication(input, { save, now: () => now }),
    ).resolves.toEqual(record)
    expect(save).toHaveBeenCalledWith(input, now)
  })
})
