import { NotImplementedError } from '@aidream/core'

interface AssetRetryRouteContext {
  readonly params: Promise<{ id: string }>
}

export function POST(
  request: Request,
  context: AssetRetryRouteContext,
): Promise<Response> {
  void request
  void context
  throw new NotImplementedError('T06:assetRetryApi')
}
