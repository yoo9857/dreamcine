import { publicPageMetadata } from '@/src/lib/seo/site'

import { CreatorApplicationExperience } from '@/src/components/creator/CreatorApplicationExperience'

export const metadata = publicPageMetadata({
  title: 'AI 영화·드라마 크리에이터 모집',
  description:
    'AI 드라마와 AI 영화를 함께 만들 ilog의 감독, 작가, 비주얼 아티스트와 프로듀서를 모집합니다. 참여 방법과 작품 지원 안내를 확인하세요.',
  path: '/creator-apply',
})

export default function CreatorApplyPage() {
  return <CreatorApplicationExperience />
}
