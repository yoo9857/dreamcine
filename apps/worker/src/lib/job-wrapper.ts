import { NotImplementedError } from '@aidream/core'
import type { Job } from 'bullmq'

export interface JobMeta {
  readonly queue: string
  readonly jobId: string
  readonly attempt: number
}

export function withJob<TData, TResult>(
  name: string,
  handler: (data: TData, meta: JobMeta) => Promise<TResult>,
): (job: Job<TData>) => Promise<TResult> {
  void name
  void handler
  throw new NotImplementedError('T11:withJob')
}
