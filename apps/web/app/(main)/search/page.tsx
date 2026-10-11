import type { ReactNode } from 'react'

import { SearchResults } from '@/src/components/feed/SearchResults'
import { getServerSession } from '@/src/auth/server-session'
import { DiscoveryFooter } from '@/src/components/discovery/DiscoveryFooter'
import type { Metadata } from 'next'

import { absoluteUrlOrNull } from '@/src/lib/site-url'
import '@/src/styles/search.css'

const CANONICAL = absoluteUrlOrNull('/search')

export const metadata: Metadata = {
  title: '검색',
  description: 'ilog 작품·회차·크리에이터 검색.',
  ...(CANONICAL === null ? {} : { alternates: { canonical: CANONICAL } }),
  robots: { index: false, follow: true },
  openGraph: {
    type: 'website',
    title: '검색 · ilog',
    description: 'ilog 작품·회차·크리에이터 검색.',
    siteName: 'ilog',
    ...(CANONICAL === null ? {} : { url: CANONICAL }),
  },
}

export default async function SearchPage(): Promise<ReactNode> {
  const session = await getServerSession()
  return (
    <div className="discovery-home search-page" id="discovery-top">
      <SearchResults user={session?.user ?? null} />
      <DiscoveryFooter handle={session?.user.handle ?? 'ilog'} />
    </div>
  )
}
