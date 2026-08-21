import type { User, UserRole, UserStatus } from '@aidream/core'
import { db } from '../client.js'
import { executeDb } from '../errors.js'
import { mapUser } from '../mappers/user.mapper.js'

export interface CreateUserData {
  handle: string
  email: string
  displayName: string
  passwordHash?: string | null
  role?: UserRole
}

export interface UpdateUserData {
  displayName?: string
  bio?: string | null
  avatarKey?: string | null
  status?: UserStatus
}

export function findUserById(id: string): Promise<User | null> {
  return executeDb(async () => {
    const row = await db.user.findFirst({ where: { id, deletedAt: null } })
    return row === null ? null : mapUser(row)
  })
}

export function findUserByEmail(email: string): Promise<User | null> {
  return executeDb(async () => {
    const row = await db.user.findFirst({ where: { email, deletedAt: null } })
    return row === null ? null : mapUser(row)
  })
}

export function findUserByHandle(handle: string): Promise<User | null> {
  return executeDb(async () => {
    const row = await db.user.findFirst({ where: { handle, deletedAt: null } })
    return row === null ? null : mapUser(row)
  })
}

export function createUser(input: CreateUserData): Promise<User> {
  return executeDb(async () =>
    mapUser(
      await db.user.create({
        data: input,
      }),
    ),
  )
}

export function updateUser(id: string, input: UpdateUserData): Promise<User> {
  return executeDb(async () =>
    mapUser(
      await db.user.update({
        where: { id, deletedAt: null },
        data: input,
      }),
    ),
  )
}

export function incrementUserFollowerCount(
  id: string,
  by: 1 | -1,
): Promise<User> {
  return executeDb(async () =>
    mapUser(
      await db.user.update({
        where: { id, deletedAt: null },
        data: { followerCount: { increment: by } },
      }),
    ),
  )
}

export function incrementUserSeriesCount(
  id: string,
  by: 1 | -1,
): Promise<User> {
  return executeDb(async () =>
    mapUser(
      await db.user.update({
        where: { id, deletedAt: null },
        data: { seriesCount: { increment: by } },
      }),
    ),
  )
}
