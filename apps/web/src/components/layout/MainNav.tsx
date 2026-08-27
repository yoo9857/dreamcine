import { can } from '@aidream/core'
import { Button } from '@aidream/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { actorFromSession } from '@/src/auth/actor'
import type { RouteSession } from '@/src/auth/types'
import { LeftBrandLogo } from '@/src/components/brand/LeftBrandLogo'
import { NavigationLinks } from './NavigationLinks'

export function MainNav({
  session,
}: {
  readonly session: RouteSession | null
}): ReactNode {
  // "스튜디오" 진입점은 제작 권한이 있는 사람에게만 보인다. 역할 문자열을
  // 직접 비교하지 않는다 — PARTNER 가 생겼을 때 이 자리를 놓치면 파트너에게
  // 스튜디오가 사라진다. (07_AUTH_SECURITY.md §2)
  const creatorRegistered = can(actorFromSession(session), 'series.create')

  return (
    <>
      <aside className="aidream-rail" aria-label="주요 메뉴">
        <Link
          href={session === null ? '/' : '/browse'}
          className="aidream-rail-brand"
          aria-label="ilog 홈"
        >
          <LeftBrandLogo />
        </Link>
        <NavigationLinks
          authenticated={session !== null}
          creatorRegistered={creatorRegistered}
        />
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

      <NavigationLinks
        authenticated={session !== null}
        creatorRegistered={creatorRegistered}
        mobile
      />
    </>
  )
}
