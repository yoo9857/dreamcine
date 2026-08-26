import type { ReactNode } from 'react'

import { SearchResults } from '@/src/components/feed/SearchResults'

export default function WorksPage(): ReactNode {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-muted">
          Discover works
        </p>
        <h1 className="text-3xl font-bold text-fg">작품</h1>
        <p className="max-w-2xl text-sm text-muted">
          새로운 에피소드와 시리즈를 제목으로 탐색해 보세요.
        </p>
      </header>
      <SearchResults initialType="episode" />
    </div>
  )
}
