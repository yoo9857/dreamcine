import type { ReactNode } from 'react'

import { SearchResults } from '@/src/components/feed/SearchResults'
import type { Metadata } from 'next'

import { absoluteUrlOrNull } from '@/src/lib/site-url'

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

export default async function SearchPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ q?: string }>
}): Promise<ReactNode> {
  const params = await searchParams
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-fg">검색</h1>
      <SearchResults initialQuery={params.q ?? ''} />
    </div>
  )
}
