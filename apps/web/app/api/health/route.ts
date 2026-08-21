import { NotImplementedError } from '@aidream/core'

import { withRoute } from '@/src/http/handler'

/**
 * 라이브니스. 프로세스가 살아있으면 항상 200 이다. 의존 서비스를 보지 않으며
 * 레이트리밋도 걸지 않는다 — 컨테이너 헬스체크가 이 경로를 주기적으로 두드린다.
 * (05_API_CONTRACT.md §9)
 */
export const GET = withRoute(
  () => Promise.reject(new NotImplementedError('T03:healthRoute')),
  { auth: 'none', csrf: false },
)
