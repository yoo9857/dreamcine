import { Button, EmptyState, Stack } from '@aidream/ui'
import Link from 'next/link'
import type { ReactNode } from 'react'

import { messages } from '@/src/lib/messages'

/**
 * 홈 — **임시**다.
 *
 * 08_UIUX_SPEC.md §1 은 `/` 를 인기 피드로 정의하며 T09 가 소유한다. 그때
 * 이 파일이 피드로 교체된다.
 *
 * 그때까지 비워 두지 않는 이유: 배포하는 순간 방문자가 보는 첫 화면이
 * 404 가 된다. Caddy 의 부트스트랩 정적 페이지는 `/api/*` 를 뺀 전부를
 * 가로채므로 앱과 공존할 수 없다 — 배포하려면 그것을 꺼야 하고, 끄면 이
 * 자리가 비어 버린다. (ISS-008)
 *
 * **가짜 피드를 만들지 않는다.** 없는 작품을 있는 것처럼 보이게 하면 T09 가
 * 진짜 데이터를 붙일 때 무엇이 진짜였는지 구분할 수 없게 된다. 지금은
 * 비어있음 상태를 정직하게 보여준다 — 08_UIUX_SPEC.md §3 이 요구하는
 * 네 상태 중 하나이며, 지금의 진실이기도 하다.
 */
export default function HomePage(): ReactNode {
  const text = messages()

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-16">
      <Stack gap={4}>
        <h1 className="text-3xl font-semibold text-fg">{text.brand.name}</h1>
        <p className="text-lg text-fg-muted">{text.brand.tagline}</p>
        <p className="text-fg-muted">{text.home.lead}</p>
      </Stack>

      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/signup">{text.home.join}</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/login">{text.home.enter}</Link>
        </Button>
      </div>

      <EmptyState
        title={text.home.buildingTitle}
        description={text.home.buildingBody}
      />
    </main>
  )
}
