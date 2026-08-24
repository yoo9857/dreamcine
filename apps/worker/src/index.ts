import { NotImplementedError } from '@aidream/core'

export interface WorkerRuntime {
  close(): Promise<void>
}

export function bootstrapWorker(): Promise<WorkerRuntime> {
  throw new NotImplementedError('T06:workerBootstrap')
}
