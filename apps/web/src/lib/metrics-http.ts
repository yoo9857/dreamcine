import { NotImplementedError, type ErrorCode } from '@aidream/core'

export interface HttpMetricInput {
  readonly route: string
  readonly method: string
  readonly status: number
  readonly durationMs: number
  readonly errorCode?: ErrorCode | undefined
}

export function recordHttpRequest(input: HttpMetricInput): void {
  void input
  throw new NotImplementedError('T11:recordHttpRequest')
}

export function renderWebMetrics(): Promise<string> {
  throw new NotImplementedError('T11:renderWebMetrics')
}
