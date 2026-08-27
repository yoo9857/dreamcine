import Form from 'next/form'
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { SessionUser } from '@/src/auth/types'
import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'

import { BrowseAccountMenu } from './BrowseAccountMenu'

function SearchIcon(): ReactNode {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 5 5" />
    </svg>
  )
}

export function DiscoveryTopbar({
  user,
}: {
  readonly user: SessionUser | null
}): ReactNode {
  return (
    <header className="discovery-topbar">
      <Link href="/browse" className="discovery-wordmark" aria-label="ilog 홈">
        <LeftBrandLogo priority />
      </Link>
      <Form className="discovery-search" action="/search" role="search">
        <SearchIcon />
        <label className="sr-only" htmlFor="discovery-query">
          작품 검색
        </label>
        <input
          id="discovery-query"
          name="q"
          minLength={2}
          maxLength={50}
          placeholder="제목, 시리즈, 크리에이터를 검색하세요"
        />
        <button type="submit">검색</button>
      </Form>
      <div className="discovery-top-actions">
        <div className="discovery-live" aria-label="새 콘텐츠 업데이트 중">
          <span /> LIVE
        </div>
        {user === null ? (
          <div className="discovery-auth-actions">
            <Link href="/signup">회원가입</Link>
            <Link href="/login">로그인</Link>
          </div>
        ) : (
          <BrowseAccountMenu user={user} />
        )}
      </div>
    </header>
  )
}
