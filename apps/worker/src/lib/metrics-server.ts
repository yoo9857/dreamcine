import { NotImplementedError } from '@aidream/core'

export interface MetricsServerHandle {
  readonly port: number
  close(): Promise<void>
}

export function startMetricsServer(port: number): Promise<MetricsServerHandle> {
  void port
  throw new NotImplementedError('T11:startMetricsServer')
}
