import { NotImplementedError } from '@aidream/core'

export interface PublishScheduledInput {
  readonly now: Date
  readonly limit?: number
}

export interface PublishScheduledResult {
  readonly examined: number
  readonly published: number
  readonly revertedToDraft: number
  readonly failed: number
  readonly hasMore: boolean
}

export function publishScheduled(
  _input: PublishScheduledInput,
): Promise<PublishScheduledResult> {
  throw new NotImplementedError('T08:publishScheduledJob')
}
