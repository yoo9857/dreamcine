import type { Metadata } from 'next'

import { AboutIlogExperience } from '@/src/components/about/AboutIlogExperience'

export const metadata: Metadata = {
  title: 'About',
  description:
    '보는 사람과 만드는 사람, 그리고 아직 존재하지 않는 이야기를 연결하는 ilog의 방향을 소개합니다.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'Stories need people | ilog',
    description: 'AI 시네마를 발견하고 만들고 함께 성장시키는 ilog의 이야기.',
    type: 'website',
  },
}

export default function AboutPage() {
  return <AboutIlogExperience />
}
