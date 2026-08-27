import { describe, expect, it } from 'vitest'

import {
  AgeRating,
  AssetStatus,
  EpisodeStatus,
  MemberTier,
  ReportStatus,
  UploadStatus,
  UserRole,
} from '../src/enums.js'

describe('고정 열거형', () => {
  it('스펙의 값과 순서가 정확히 일치한다', () => {
    expect(UploadStatus).toEqual([
      'CREATED',
      'UPLOADING',
      'UPLOADED',
      'FAILED',
      'ABORTED',
    ])
    expect(AssetStatus).toEqual([
      'PENDING',
      'PROBING',
      'TRANSCODING',
      'READY',
      'FAILED',
    ])
    expect(EpisodeStatus).toEqual([
      'DRAFT',
      'SCHEDULED',
      'PUBLISHED',
      'HIDDEN',
      'REMOVED',
    ])
    // 사다리 순서 그대로다. GUEST 는 저장되지 않으므로 여기 없다 — 그 불변식은
    // roles.test.ts 가 지킨다. (ISS-020)
    expect(UserRole).toEqual([
      'VIEWER',
      'MEMBER',
      'CREATOR',
      'PARTNER',
      'MODERATOR',
      'ADMIN',
    ])
    expect(MemberTier).toEqual([
      'BRONZE',
      'SILVER',
      'GOLD',
      'PLATINUM',
      'DIAMOND',
    ])
    expect(ReportStatus).toEqual(['OPEN', 'REVIEWING', 'ACTIONED', 'REJECTED'])
    expect(AgeRating).toEqual(['ALL', 'A12', 'A15', 'A19'])
  })
})
