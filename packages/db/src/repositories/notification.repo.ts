import {
  NotImplementedError,
  type Notification,
  type NotificationPayload,
  type Page,
} from '@aidream/core'

export interface CreateNotificationData {
  readonly id?: string
  readonly userId: string
  readonly payload: NotificationPayload
}

export function createNotification(
  _input: CreateNotificationData,
): Promise<Notification> {
  throw new NotImplementedError('T10:insertNotification')
}

export function createNotifications(
  _inputs: readonly CreateNotificationData[],
): Promise<number> {
  throw new NotImplementedError('T10:insertNotifications')
}

export function listNotificationsPage(_options: {
  readonly userId: string
  readonly limit: number
  readonly cursor?: string
}): Promise<Page<Notification>> {
  throw new NotImplementedError('T10:listNotificationsRepo')
}

export function markNotificationsReadByIds(
  _userId: string,
  _ids: readonly string[],
): Promise<number> {
  throw new NotImplementedError('T10:markNotificationsReadRepo')
}

export function listFollowerIds(_options: {
  readonly creatorId: string
  readonly limit: number
  readonly cursor?: string
}): Promise<Page<string>> {
  throw new NotImplementedError('T10:listFollowerIds')
}
