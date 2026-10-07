export const CREATOR_REFERRALS = [
  { value: 'INSTAGRAM', label: '인스타그램' },
  { value: 'NAVER', label: '네이버' },
  { value: 'FACEBOOK', label: '페이스북' },
  { value: 'X', label: 'X · 트위터' },
  { value: 'YOUTUBE', label: '유튜브' },
  { value: 'OTHER_SOCIAL', label: '그 외 소셜' },
  { value: 'FRIEND', label: '친구 · 지인 소개' },
  { value: 'OTHER', label: '기타' },
] as const

export function referralSourceLabel(value: string | null): string {
  return (
    CREATOR_REFERRALS.find((item) => item.value === value)?.label ?? '미수집'
  )
}
