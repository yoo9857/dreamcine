import { Button } from '@aidream/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { RouteSession } from '@/src/auth/types'

export function MainNav({
  session,
}: {
  readonly session: RouteSession | null
}): ReactNode {
  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-4">
          <Link href="/" className="text-lg font-bold text-fg">
            AIDREAM
          </Link>
          <nav
            aria-label="주요 메뉴"
            className="hidden items-center gap-4 sm:flex"
          >
            <Link href="/" className="text-sm text-fg-secondary hover:text-fg">
              인기
            </Link>
            <Link
              href="/following"
              className="text-sm text-fg-secondary hover:text-fg"
            >
              팔로잉
            </Link>
            <Link
              href="/search"
              className="text-sm text-fg-secondary hover:text-fg"
            >
              검색
            </Link>
            {session === null ? null : (
              <Link
                href="/notifications"
                className="text-sm text-fg-secondary hover:text-fg"
              >
                알림
              </Link>
            )}
          </nav>
          <div className="ml-auto mr-12 flex items-center gap-2">
            {session === null ? (
              <>
                <Button asChild size="sm" variant="secondary">
                  <Link href="/signup">회원가입</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/login">로그인</Link>
                </Button>
              </>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href="/studio">업로드</Link>
              </Button>
            )}
          </div>
        </div>
      </header>
      <nav
        aria-label="모바일 주요 메뉴"
        className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-3 border-t border-border bg-bg sm:hidden"
      >
        <Link href="/" className="px-3 py-3 text-center text-sm">
          인기
        </Link>
        <Link href="/following" className="px-3 py-3 text-center text-sm">
          팔로잉
        </Link>
        <Link href="/search" className="px-3 py-3 text-center text-sm">
          검색
        </Link>
      </nav>
    </>
  )
}
