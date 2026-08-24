import { NotImplementedError } from '@aidream/core'

interface AssetRouteContext {
  readonly params: Promise<{ id: string }>
}

export function GET(
  request: Request,
  context: AssetRouteContext,
): Promise<Response> {
  void request
  void context
  throw new NotImplementedError('T06:assetStatusApi')
}
