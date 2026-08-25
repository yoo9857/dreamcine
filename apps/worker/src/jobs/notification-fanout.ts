import { NotImplementedError } from '@aidream/core'

export interface NotificationFanoutInput {
  readonly type: 'NEW_EPISODE'
  readonly episodeId: string
  readonly cursor?: string
}

export interface NotificationFanoutResult {
  readonly created: number
  readonly nextCursor: string | null
}

export function notificationFanoutJob(
  _input: NotificationFanoutInput,
): Promise<NotificationFanoutResult> {
  throw new NotImplementedError('T10:notificationFanoutJob')
}
