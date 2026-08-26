import { Button } from '@aidream/ui'
import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'

import type { RouteSession } from '@/src/auth/types'
import { NavigationLinks } from './NavigationLinks'

export function MainNav({
  session,
}: {
  readonly session: RouteSession | null
}): ReactNode {
  return (
    <>
      <aside className="aidream-rail" aria-label="주요 메뉴">
        <Link href="/" className="aidream-rail-brand" aria-label="ilog 홈">
          <Image
            src="/brand/ilog-app-icon.png"
            alt=""
            width={43}
            height={43}
            unoptimized
          />
        </Link>
        <NavigationLinks authenticated={session !== null} />
      </aside>

      {session === null ? (
        <div className="aidream-session-actions">
          <>
            <Button asChild size="sm" variant="secondary">
              <Link href="/signup">회원가입</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login">로그인</Link>
            </Button>
          </>
        </div>
      ) : null}

      <NavigationLinks authenticated={session !== null} mobile />
    </>
  )
}
