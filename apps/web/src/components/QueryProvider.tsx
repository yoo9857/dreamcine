'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React, { useState, type ReactNode } from 'react'

/**
 * 서버 상태의 기본값을 **한 곳에서** 정한다. (03_TECH_STACK.md §3)
 *
 * 여기서 정한 값이 이후 모든 화면의 기본이 된다. 화면마다 다르게 두면
 * "왜 이 화면만 새로고침이 안 되지" 를 매번 추적하게 된다.
 */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /*
          피드는 랭킹 배치가 주기적으로 바꾼다. 60초 안에는 다시 묻지 않는다 —
          08_UIUX_SPEC §1 이 시리즈 상세에 60초 캐시를 명시하는 것과 같은 결이다.
        */
        staleTime: 60_000,
        /*
          탭을 옮길 때마다 다시 부르지 않는다. 무한스크롤 피드에서 이것이
          켜져 있으면 스크롤 위치를 지키면서 전체를 다시 받는 낭비가 난다.
        */
        refetchOnWindowFocus: false,
        /*
          한 번만 다시 시도한다. 4xx 는 다시 시도해도 같은 답이고, 5xx 는
          이미 서버가 재시도한 뒤다. 여러 번 시도하면 사용자에게는 그냥
          "느린 화면" 으로 보인다.
        */
        retry: 1,
      },
      mutations: {
        /*
          변경은 재시도하지 않는다. 멱등하지 않은 요청을 자동으로 두 번
          보내면 댓글이 두 개 달린다. 재시도는 호출부가 의도적으로 정한다.
        */
        retry: 0,
      },
    },
  })
}

/**
 * `useState` 로 감싸는 이유: 모듈 최상위에서 만들면 서버에서 **모든 요청이
 * 같은 캐시를 공유**한다. 다른 사용자의 응답이 섞여 나갈 수 있다.
 */
export function QueryProvider({
  children,
}: {
  readonly children: ReactNode
}): ReactNode {
  const [client] = useState(createQueryClient)

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
