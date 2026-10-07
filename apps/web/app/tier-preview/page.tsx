import { loadCapacity, TIER_LADDER, type MemberTier } from '@aidream/core'
import type { TierActivitySnapshot } from '@aidream/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'

import { TierOverview } from '@/src/components/account/TierOverview'
import { tierBenefits } from '@/src/content/member-tier-guide'
import { BrowseAccountMenu } from '@/src/components/discovery/BrowseAccountMenu'
import { getMyTier } from '@/src/services/user/get-my-tier'

const DAY_MS = 86_400_000

/** 등급마다 실제 산정 함수를 거치는 표본 실적. DB 없이 화면을 검수한다. */
const SAMPLES: Readonly<Record<MemberTier, Partial<TierActivitySnapshot>>> = {
  BRONZE: { followerCount: 12, likesGiven: 40, commentsPosted: 6 },
  SILVER: {
    followerCount: 180,
    episodesPublished: 4,
    totalViews: 9_400,
    watchSeconds: 30 * 3600,
  },
  GOLD: {
    followerCount: 2_100,
    episodesPublished: 38,
    totalViews: 128_000,
    watchSeconds: 120 * 3600,
    commentsPosted: 140,
    likesGiven: 600,
  },
  PLATINUM: {
    followerCount: 14_000,
    episodesPublished: 160,
    totalViews: 1_900_000,
    watchSeconds: 400 * 3600,
  },
  DIAMOND: {
    followerCount: 50_000,
    episodesPublished: 520,
    totalViews: 4_200_000,
    watchSeconds: 900 * 3600,
  },
}

export default async function TierPreviewPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ tier?: string }>
}): Promise<ReactNode> {
  if (process.env.NODE_ENV === 'production') notFound()
  const requested = (await searchParams).tier?.toUpperCase()
  const selected: MemberTier =
    TIER_LADDER.find((tier) => tier === requested) ?? 'BRONZE'

  const now = new Date()
  const tier = await getMyTier('preview', {
    read: () =>
      Promise.resolve({
        role: 'CREATOR',
        tier: selected,
        tierPoints: 0,
        tierEvaluatedAt: null,
        createdAt: new Date(now.getTime() - 120 * DAY_MS),
        followerCount: 0,
        totalViews: 0,
        episodesPublished: 0,
        watchSeconds: 0,
        commentsPosted: 0,
        likesGiven: 0,
        ...SAMPLES[selected],
      }),
    now: () => now,
  })

  return (
    <>
      <nav aria-label="미리보기 등급 선택" className="tier-preview-bar">
        <strong>DEV PREVIEW</strong>
        {TIER_LADDER.map((entry) => (
          <Link
            key={entry}
            href={`/tier-preview?tier=${entry}`}
            aria-current={entry === selected ? 'page' : undefined}
          >
            {entry}
          </Link>
        ))}
        <span>오른쪽 계정 메뉴 → ? 버튼</span>
        <BrowseAccountMenu
          user={{
            id: 'preview',
            handle: 'preview.creator',
            displayName: '미리보기',
            email: 'preview@example.com',
            role: 'CREATOR',
            status: 'ACTIVE',
            emailVerified: true,
            tier: tier.appliedTier,
            isVerified: false,
          }}
        />
      </nav>
      <TierOverview
        tier={tier}
        benefits={tierBenefits('CREATOR', loadCapacity('T0'))}
      />
    </>
  )
}
