import { publicPageMetadata } from '@/src/lib/seo/site'

import { AboutIlogExperience } from '@/src/components/about/AboutIlogExperience'

export const metadata = publicPageMetadata({
  title: 'ilog 소개 — AI 영상 플랫폼',
  description:
    'AI 영화와 드라마를 발견하고 만드는 영상 플랫폼 ilog. 시청자와 크리에이터를 작품과 이야기로 연결하는 서비스의 방향을 소개합니다.',
  path: '/about',
})

export default function AboutPage() {
  return <AboutIlogExperience />
}
