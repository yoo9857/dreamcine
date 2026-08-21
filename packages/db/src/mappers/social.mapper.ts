import type {
  Comment as PrismaComment,
  Notification as PrismaNotification,
} from '@prisma/client'
import type { Comment, Notification } from '@aidream/core'

export function mapComment(row: PrismaComment): Comment {
  return {
    id: row.id,
    episodeId: row.episodeId,
    userId: row.userId,
    parentId: row.parentId,
    body: row.body,
    isHidden: row.isHidden,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }
}

export function mapNotification(row: PrismaNotification): Notification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    payload: row.payload,
    readAt: row.readAt,
    createdAt: row.createdAt,
  }
}
