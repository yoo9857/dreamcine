import { NotImplementedError } from '@aidream/core'

export interface SchedulerHandle {
  close(): Promise<void>
}

export function startScheduler(signal?: AbortSignal): Promise<SchedulerHandle> {
  void signal
  throw new NotImplementedError('T06:scheduler')
}
