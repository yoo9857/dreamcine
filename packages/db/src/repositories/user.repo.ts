import type { User, UserRole, UserStatus } from '@aidream/core'
import { NotImplementedError } from '@aidream/core'

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

export function findUserById(_id: string): Promise<User | null> {
  throw new NotImplementedError('T02:findUserById')
}

export function findUserByEmail(_email: string): Promise<User | null> {
  throw new NotImplementedError('T02:findUserByEmail')
}

export function findUserByHandle(_handle: string): Promise<User | null> {
  throw new NotImplementedError('T02:findUserByHandle')
}

export function createUser(_input: CreateUserData): Promise<User> {
  throw new NotImplementedError('T02:createUser')
}

export function updateUser(_id: string, _input: UpdateUserData): Promise<User> {
  throw new NotImplementedError('T02:updateUser')
}

export function incrementUserFollowerCount(
  _id: string,
  _by: 1 | -1,
): Promise<User> {
  throw new NotImplementedError('T02:incrementUserFollowerCount')
}

export function incrementUserSeriesCount(
  _id: string,
  _by: 1 | -1,
): Promise<User> {
  throw new NotImplementedError('T02:incrementUserSeriesCount')
}
