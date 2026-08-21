import { withRoute } from '@/src/http/handler'
import { checkReadiness } from '@/src/services/system/ready'

/** 레디니스. 배포 시 트래픽 전환 판단에 쓰이므로 레이트리밋을 걸지 않는다. */
export const GET = withRoute(
  async () => {
    const result = await checkReadiness()
    return { status: result.status === 'ok' ? 200 : 503, body: result }
  },
  { auth: 'none', csrf: false },
)
