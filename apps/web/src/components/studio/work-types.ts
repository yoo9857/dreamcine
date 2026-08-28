import type { WorkType } from '@aidream/core'

export const WORK_TYPE_OPTIONS: readonly {
  readonly value: WorkType
  readonly label: string
  readonly description: string
}[] = [
  {
    value: 'SERIES',
    label: '시리즈',
    description: '시즌과 1화·2화·3화로 이어지는 연재 작품',
  },
  {
    value: 'FILM',
    label: '영화·단편',
    description: '장편, 중편, 단편처럼 한 편으로 완결되는 작품',
  },
  {
    value: 'SHORT_FORM',
    label: '숏폼',
    description: '세로형·짧은 호흡의 독립 영상 콘텐츠',
  },
  {
    value: 'COMMERCIAL',
    label: '광고·CF',
    description: '브랜드 필름, 캠페인, 제품 광고와 여러 버전',
  },
  {
    value: 'MUSIC_VIDEO',
    label: '뮤직비디오',
    description: '음악을 중심으로 제작한 공식 영상과 비주얼라이저',
  },
  {
    value: 'OTHER',
    label: '기타 작품',
    description: '다큐멘터리, 실험 영상 등 위 형식에 속하지 않는 작품',
  },
] as const

export function workTypeLabel(value: WorkType): string {
  return WORK_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? '작품'
}
