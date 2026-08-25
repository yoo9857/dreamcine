import type { ReactNode } from 'react'

import { SearchResults } from '@/src/components/feed/SearchResults'

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
