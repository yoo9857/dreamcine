import { describe, expect, it } from 'vitest'

import {
  AgeRating,
  AssetStatus,
  EpisodeStatus,
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
    expect(UserRole).toEqual(['VIEWER', 'CREATOR', 'MODERATOR', 'ADMIN'])
    expect(ReportStatus).toEqual(['OPEN', 'REVIEWING', 'ACTIONED', 'REJECTED'])
    expect(AgeRating).toEqual(['ALL', 'A12', 'A15', 'A19'])
  })
})
