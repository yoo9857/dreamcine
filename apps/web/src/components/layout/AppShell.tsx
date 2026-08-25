import { Suspense, type ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { MainNav } from './MainNav'

async function SessionMainNav(): Promise<ReactNode> {
  const session = await getServerSession()
  return <MainNav session={session} />
}

export function AppShell({
  children,
}: {
  readonly children: ReactNode
}): ReactNode {
  return (
    <div className="min-h-dvh bg-bg pb-16 sm:pb-0">
      {/*
        공개 본문은 세션 DB 조회와 무관하다. 내비게이션만 스트리밍 경계에 두어
        홈의 제목과 피드 스켈레톤이 세션 확인을 기다리지 않게 한다.
        fallback은 비로그인 내비와 크기가 같아 게스트 첫 화면의 CLS도 늘리지 않는다.
      */}
      <Suspense fallback={<MainNav session={null} />}>
        <SessionMainNav />
      </Suspense>
      <main className="mx-auto w-full max-w-7xl px-4 py-8">{children}</main>
    </div>
  )
}
