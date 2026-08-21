import type { User as PrismaUser } from '@prisma/client'
import type { User } from '@aidream/core'

export function mapUser(row: PrismaUser): User {
  return {
    id: row.id,
    handle: row.handle,
    email: row.email,
    emailVerified: row.emailVerified,
    passwordHash: row.passwordHash,
    displayName: row.displayName,
    bio: row.bio,
    avatarKey: row.avatarKey,
    role: row.role,
    status: row.status,
    followerCount: row.followerCount,
    seriesCount: row.seriesCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  }
}
