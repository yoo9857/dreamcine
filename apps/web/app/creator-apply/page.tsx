import type { Metadata } from 'next'

import { CreatorApplicationExperience } from '@/src/components/creator/CreatorApplicationExperience'

export const metadata: Metadata = {
  title: '크리에이터 모집',
  description:
    'AI 드라마와 AI 영화를 함께 만들 ilog의 새로운 감독, 작가, 비주얼 아티스트와 프로듀서를 모집합니다.',
  alternates: { canonical: '/creator-apply' },
  openGraph: {
    title: 'AI 영화·드라마 크리에이터 모집 | ilog',
    description:
      '감독, 작가, AI 비주얼 아티스트, 프로듀서를 모집합니다. 작품 링크와 만들고 싶은 이야기로 지원하세요.',
    type: 'website',
  },
}

export default function CreatorApplyPage() {
  return <CreatorApplicationExperience />
}
