import {
  AppError,
  type AgeRating,
  type ConsentKind,
  type ContentLicense,
  type Gender,
  type Page,
  type SignupPurpose,
  type User,
  type UserConsent,
  type UserLink,
  type UserRole,
  type UserStatus,
  type Visibility,
} from '@aidream/core'
import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'
import { mapUser } from '../mappers/user.mapper.js'

export interface CreateUserData {
  handle: string
  email: string
  displayName: string
  passwordHash?: string | null
  role?: UserRole
  locale?: string
  birthDate?: Date | null
  gender?: Gender | null
  signupPurpose?: SignupPurpose | null
  country?: string | null
  consents?: readonly {
    kind: ConsentKind
    version: string
    granted: boolean
  }[]
}

export interface UpdateUserData {
  displayName?: string
  bio?: string | null
  avatarKey?: string | null
  status?: UserStatus
  bannerKey?: string | null
  channelDescription?: string | null
  channelKeywords?: string[]
  country?: string | null
  locale?: string
  timezone?: string
  birthDate?: Date | null
  profileVisibility?: Visibility
  hideFollowerCount?: boolean
  trailerEpisodeId?: string | null
  defaultAgeRating?: AgeRating
  defaultLanguage?: string
  defaultLicense?: ContentLicense
}

export interface MarketingRecipient {
  readonly id: string
  readonly email: string
  readonly handle: string
  readonly locale: string
}

export function listUserConsents(
  userId: string,
): Promise<readonly UserConsent[]> {
  return executeDb(() =>
    db.userConsent.findMany({
      where: { userId },
      orderBy: [{ kind: 'asc' }, { grantedAt: 'desc' }],
    }),
  )
}

export function setUserConsent(input: {
  userId: string
  kind: ConsentKind
  version: string
  granted: boolean
  ipHash?: string | null
  userAgent?: string | null
}): Promise<UserConsent> {
  const now = new Date()
  return executeDb(() =>
    db.userConsent.upsert({
      where: {
        userId_kind_version: {
          userId: input.userId,
          kind: input.kind,
          version: input.version,
        },
      },
      create: {
        ...input,
        grantedAt: now,
        revokedAt: input.granted ? null : now,
      },
      update: {
        granted: input.granted,
        grantedAt: now,
        revokedAt: input.granted ? null : now,
        ...(input.ipHash === undefined ? {} : { ipHash: input.ipHash }),
        ...(input.userAgent === undefined
          ? {}
          : { userAgent: input.userAgent }),
      },
    }),
  )
}

/** 발송 직전 재검사용 최신 마케팅 동의 판정. */
export async function hasActiveMarketingConsent(
  userId: string,
): Promise<boolean> {
  const latest = await executeDb(() =>
    db.userConsent.findFirst({
      where: { userId, kind: 'MARKETING' },
      orderBy: [{ grantedAt: 'desc' }, { id: 'desc' }],
      select: { granted: true, revokedAt: true },
    }),
  )
  return latest?.granted === true && latest.revokedAt === null
}

/**
 * 캠페인 후보 목록. 각 계정의 최신 MARKETING 기록 하나만 가져온 뒤 동의자를
 * 남긴다. 실제 전송 함수도 다시 검사해 목록 생성과 발송 사이의 철회를 막는다.
 */
export async function listMarketingRecipients(
  limit: number,
  consentVersion: string,
): Promise<readonly MarketingRecipient[]> {
  const users = await executeDb(() =>
    db.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        emailVerified: { not: null },
        consents: {
          some: {
            kind: 'MARKETING',
            version: consentVersion,
            granted: true,
            revokedAt: null,
          },
        },
      },
      orderBy: { id: 'asc' },
      take: Math.max(1, Math.min(limit, 1000)),
      select: {
        id: true,
        email: true,
        handle: true,
        locale: true,
        consents: {
          where: { kind: 'MARKETING', version: consentVersion },
          orderBy: [{ grantedAt: 'desc' as const }, { id: 'desc' as const }],
          take: 1,
          select: { granted: true, revokedAt: true },
        },
      },
    }),
  )
  return users
    .filter(
      (user) =>
        user.consents[0]?.granted === true &&
        user.consents[0].revokedAt === null,
    )
    .map(({ consents: _consents, ...user }) => user)
}

/** 채널 외부 링크. 프로필 헤더와 `ProfilePage` JSON-LD 가 같은 값을 쓴다. */
export function listUserLinks(userId: string): Promise<readonly UserLink[]> {
  return executeDb(async () => {
    const rows = await db.userLink.findMany({
      where: { userId },
      orderBy: [{ order: 'asc' }, { label: 'asc' }],
    })
    return rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      label: row.label,
      url: row.url,
      order: row.order,
    }))
  })
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

export function listRelatedCreators(
  userId: string,
  limit: number,
): Promise<readonly User[]> {
  return executeDb(async () => {
    const rows = await db.user.findMany({
      where: {
        id: { not: userId },
        deletedAt: null,
        status: 'ACTIVE',
        series: {
          some: {
            deletedAt: null,
            episodes: { some: { status: 'PUBLISHED', deletedAt: null } },
          },
        },
      },
      orderBy: [{ followerCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })
    return rows.map(mapUser)
  })
}

export function listFeaturedCreators(limit: number): Promise<readonly User[]> {
  return executeDb(async () => {
    const rows = await db.user.findMany({
      where: {
        deletedAt: null,
        status: 'ACTIVE',
        series: {
          some: {
            deletedAt: null,
            episodes: { some: { status: 'PUBLISHED', deletedAt: null } },
          },
        },
      },
      orderBy: [{ followerCount: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })
    return rows.map(mapUser)
  })
}

export function listUsersForAdmin(options: {
  limit: number
  cursor?: string
  query?: string
}): Promise<Page<User>> {
  return executeDb(async () => {
    let cursor: { createdAt: Date; id: string } | null = null
    if (options.cursor !== undefined) {
      const payload = decodeCursor(options.cursor)
      if (typeof payload.k !== 'string')
        throw new AppError('E_FEED_INVALID_CURSOR')
      const createdAt = new Date(payload.k)
      if (Number.isNaN(createdAt.getTime()))
        throw new AppError('E_FEED_INVALID_CURSOR')
      cursor = { createdAt, id: payload.id }
    }
    const rows = await db.user.findMany({
      where: {
        deletedAt: null,
        AND: [
          options.query === undefined
            ? {}
            : {
                OR: [
                  {
                    handle: {
                      contains: options.query,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    email: {
                      contains: options.query,
                      mode: 'insensitive' as const,
                    },
                  },
                  {
                    displayName: {
                      contains: options.query,
                      mode: 'insensitive' as const,
                    },
                  },
                ],
              },
          cursor === null
            ? {}
            : {
                OR: [
                  { createdAt: { lt: cursor.createdAt } },
                  { createdAt: cursor.createdAt, id: { lt: cursor.id } },
                ],
              },
        ],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    })
    const hasNext = rows.length > options.limit
    const pageRows = hasNext ? rows.slice(0, options.limit) : rows
    const last = pageRows.at(-1)
    return {
      items: pageRows.map(mapUser),
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({ k: last.createdAt.toISOString(), id: last.id })
          : null,
    }
  })
}

export function createUser(input: CreateUserData): Promise<User> {
  return executeDb(async () => {
    const { consents, ...data } = input
    return mapUser(
      await db.user.create({
        data: {
          ...data,
          ...(consents === undefined || consents.length === 0
            ? {}
            : { consents: { createMany: { data: [...consents] } } }),
        },
      }),
    )
  })
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

export function setUserModerationStatus(
  userId: string,
  status: UserStatus,
): Promise<void> {
  return executeDb(async () => {
    await db.$transaction(async (transaction) => {
      await transaction.user.update({ where: { id: userId }, data: { status } })
      if (status !== 'SUSPENDED') return

      await transaction.session.deleteMany({ where: { userId } })
      await transaction.episode.updateMany({
        where: { series: { ownerId: userId }, status: { not: 'REMOVED' } },
        data: { status: 'HIDDEN' },
      })
      await transaction.uploadSession.updateMany({
        where: { userId, status: { in: ['CREATED', 'UPLOADING'] } },
        data: { status: 'ABORTED' },
      })
    })
  })
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
