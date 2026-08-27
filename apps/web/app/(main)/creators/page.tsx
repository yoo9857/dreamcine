import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { CreatorDirectory } from '@/src/components/creators/CreatorDirectory'
import { DiscoveryFooter } from '@/src/components/discovery/DiscoveryFooter'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import type { Metadata } from 'next'

import { absoluteUrlOrNull } from '@/src/lib/site-url'

const CANONICAL = absoluteUrlOrNull('/creators')

export const metadata: Metadata = {
  title: '크리에이터',
  description: 'ilog에서 AI 드라마를 만드는 크리에이터를 만나보세요.',
  ...(CANONICAL === null ? {} : { alternates: { canonical: CANONICAL } }),
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    title: '크리에이터 · ilog',
    description: 'ilog에서 AI 드라마를 만드는 크리에이터를 만나보세요.',
    siteName: 'ilog',
    ...(CANONICAL === null ? {} : { url: CANONICAL }),
  },
}

import {
  getFeaturedCreators,
  type CreatorDirectoryItem,
} from '@/src/services/user/get-featured-creators'

import '@/src/styles/creators-gallery.css'

const developmentPreviewUser = {
  id: 'preview-user',
  handle: 'hanbin',
  email: 'preview@ilog.local',
  displayName: '한빈',
  role: 'CREATOR',
  status: 'ACTIVE',
  emailVerified: true,
  tier: 'GOLD',
  isVerified: true,
} as const

const developmentCreators: readonly CreatorDirectoryItem[] = [
  {
    handle: 'hanbin',
    displayName: '한빈',
    bio: '기억과 도시의 경계에서 오래 남는 장면을 만듭니다.',
    avatarUrl: '/brand/profiles/paul-trillo.jpg',
    tier: 'GOLD',
    isVerified: true,
    followerCount: 12840,
    seriesCount: 5,
  },
  {
    handle: 'sora.archive',
    displayName: '소라',
    bio: '낯선 움직임과 감각적인 색으로 새로운 세계를 기록합니다.',
    avatarUrl: '/brand/profiles/cristobal-valenzuela.jpeg',
    tier: 'GOLD',
    isVerified: true,
    followerCount: 9220,
    seriesCount: 8,
  },
  {
    handle: 'minseo.film',
    displayName: '민서',
    bio: '짧지만 선명한 감정의 순간을 시네마틱 필름으로 전합니다.',
    avatarUrl: '/brand/profiles/minseo-color.webp',
    tier: 'GOLD',
    isVerified: true,
    followerCount: 7810,
    seriesCount: 6,
  },
  {
    handle: 'doha.visuals',
    displayName: '도하',
    bio: '기술과 상상력이 만나는 비주얼 스토리를 설계합니다.',
    avatarUrl: '/brand/profiles/michael-burns.jpg',
    tier: 'GOLD',
    isVerified: true,
    followerCount: 6340,
    seriesCount: 11,
  },
  {
    handle: 'noa.motion',
    displayName: '노아',
    bio: '리듬과 움직임을 중심으로 한 실험적인 숏폼을 만듭니다.',
    avatarUrl: '/brand/profiles/noa-color.webp',
    tier: 'GOLD',
    isVerified: true,
    followerCount: 5190,
    seriesCount: 7,
  },
  {
    handle: 'yoon.frame',
    displayName: '윤',
    bio: '사람과 공간 사이의 조용한 서사를 오래 바라봅니다.',
    avatarUrl: '/brand/profiles/james-cameron.jpg',
    tier: 'GOLD',
    isVerified: true,
    followerCount: 4820,
    seriesCount: 4,
  },
]

async function loadCreators(): Promise<readonly CreatorDirectoryItem[]> {
  if (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL) {
    return developmentCreators
  }
  return getFeaturedCreators(24)
}

export default async function CreatorsPage(): Promise<ReactNode> {
  const [session, creators] = await Promise.all([
    getServerSession(),
    loadCreators(),
  ])
  const headerUser =
    session?.user ??
    (process.env.NODE_ENV === 'development' && !process.env.DATABASE_URL
      ? developmentPreviewUser
      : null)

  return (
    <div className="creators-page" id="discovery-top">
      <DiscoveryTopbar user={headerUser} />
      <CreatorDirectory initialCreators={creators} />
      <DiscoveryFooter handle={headerUser?.handle ?? 'ilog'} />
    </div>
  )
}
