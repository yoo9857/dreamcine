import { describe, expect, it } from 'vitest'

import {
  CreateReportSchema,
  ReviewReportSchema,
  UpdateUserStatusSchema,
} from './report.schema.js'

describe('report schemas', () => {
  it('유효한 신고와 심사 액션을 받는다', () => {
    expect(
      CreateReportSchema.parse({
        target: 'EPISODE',
        targetId: 'episode_1',
        reason: 'COPYRIGHT',
      }),
    ).toMatchObject({ target: 'EPISODE', reason: 'COPYRIGHT' })
    expect(ReviewReportSchema.parse({ action: 'REJECT' }).action).toBe('REJECT')
  })

  it('상세와 조치 사유의 길이·필수 조건을 강제한다', () => {
    expect(() =>
      CreateReportSchema.parse({
        target: 'EPISODE',
        targetId: 'episode_1',
        reason: 'OTHER',
        detail: 'x'.repeat(1001),
      }),
    ).toThrow()
    expect(() =>
      UpdateUserStatusSchema.parse({ status: 'SUSPENDED', reason: '' }),
    ).toThrow()
  })
})
