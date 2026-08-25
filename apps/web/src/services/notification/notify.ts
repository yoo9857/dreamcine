import { NotImplementedError, type NotificationPayload } from '@aidream/core'

export type NotifyInput = NotificationPayload & { readonly to: string }

export function notify(_input: NotifyInput): Promise<void> {
  throw new NotImplementedError('T10:notify')
}
