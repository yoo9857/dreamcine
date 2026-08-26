import type { Metadata } from 'next'

import { CreatorApplicationExperience } from '@/src/components/creator/CreatorApplicationExperience'

export const metadata: Metadata = {
  title: '크리에이터 모집',
  description:
    'AI 드라마와 AI 영화를 함께 만들 ilog의 새로운 감독, 작가, 비주얼 아티스트와 프로듀서를 모집합니다.',
  alternates: { canonical: '/creator-apply' },
  openGraph: {
    title: 'CREATE WHAT COMES NEXT | ilog Creator Call',
    description:
      '아직 본 적 없는 이야기를 현실로 만들 크리에이터를 기다립니다.',
    type: 'website',
  },
}

export default function CreatorApplyPage() {
  return <CreatorApplicationExperience />
}
