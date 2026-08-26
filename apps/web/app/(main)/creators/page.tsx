import type { ReactNode } from 'react'

import { SearchResults } from '@/src/components/feed/SearchResults'

export default function CreatorsPage(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">
          Meet creators
        </p>
        <h1 className="text-3xl font-bold text-fg">작가</h1>
        <p className="max-w-2xl text-sm text-muted">
          취향을 확장해 줄 작가를 찾고 프로필과 작품을 만나보세요.
        </p>
      </header>
      <SearchResults initialType="user" />
    </div>
  )
}
