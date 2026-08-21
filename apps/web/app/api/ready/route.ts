import { NotImplementedError } from '@aidream/core'

import { withRoute } from '@/src/http/handler'

/** 레디니스. 배포 시 트래픽 전환 판단에 쓰이므로 레이트리밋을 걸지 않는다. */
export const GET = withRoute(
  () => Promise.reject(new NotImplementedError('T03:readyRoute')),
  { auth: 'none', csrf: false },
)
