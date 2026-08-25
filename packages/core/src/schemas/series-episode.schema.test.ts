import { describe, expect, it } from 'vitest'

import {
  CreateEpisodeSchema,
  CreateSeriesSchema,
  PublishEpisodeSchema,
  UpdateEpisodeSchema,
  UpdateSeriesSchema,
} from '../index.js'

describe('series schemas', () => {
  it('시리즈 생성·수정 경계값을 검증한다', () => {
    expect(
      CreateSeriesSchema.parse({ title: '새 시리즈', ageRating: 'A12' }),
    ).toMatchObject({ title: '새 시리즈' })
    expect(UpdateSeriesSchema.parse({ commentsOff: true })).toEqual({
      commentsOff: true,
    })
    expect(() => CreateSeriesSchema.parse({ title: '' })).toThrow()
    expect(() => CreateSeriesSchema.parse({ title: 'a'.repeat(121) })).toThrow()
  })
})

describe('episode schemas', () => {
  const valid = {
    seriesId: 'series_1',
    number: 1,
    title: '첫 화',
    assetId: 'asset_1',
    ageRating: 'ALL',
    aiDisclosure: 'AIDREAM',
  }

  it('계약의 필수 필드와 태그 10개 상한을 검증한다', () => {
    expect(CreateEpisodeSchema.parse(valid)).toMatchObject(valid)
    expect(() =>
      CreateEpisodeSchema.parse({
        ...valid,
        tags: Array.from({ length: 11 }, (_, index) => `tag-${String(index)}`),
      }),
    ).toThrow()
    expect(() =>
      CreateEpisodeSchema.parse({ ...valid, aiDisclosure: '' }),
    ).toThrow()
  })

  it('일반 수정에서는 상태 필드를 받지 않는다', () => {
    expect(UpdateEpisodeSchema.parse({ title: '수정' })).toEqual({
      title: '수정',
    })
    expect(UpdateEpisodeSchema.parse({ status: 'PUBLISHED' })).toEqual({})
  })

  it('공개 액션과 ISO 예약시각을 검증한다', () => {
    expect(
      PublishEpisodeSchema.parse({
        action: 'SCHEDULE',
        publishAt: '2026-08-26T00:00:00.000Z',
      }),
    ).toMatchObject({ action: 'SCHEDULE' })
    expect(() => PublishEpisodeSchema.parse({ action: 'DELETE' })).toThrow()
  })
})
