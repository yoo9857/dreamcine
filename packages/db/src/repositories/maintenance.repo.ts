import { db } from '../client.js'
import { executeDb } from '../errors.js'

export interface PurgeDataInput {
  readonly now: Date
  readonly dryRun: boolean
  readonly limit: number
}

export interface PurgeDataResult {
  readonly candidates: number
  readonly deleted: number
}

export function purgeExpiredData(
  input: PurgeDataInput,
): Promise<PurgeDataResult> {
  return executeDb(async () => {
    const softDeleteBefore = new Date(
      input.now.getTime() - 90 * 24 * 60 * 60 * 1000,
    )
    const sessionBefore = new Date(
      input.now.getTime() - 7 * 24 * 60 * 60 * 1000,
    )
    const [comments, episodes, series, users, sessions, notifications, tokens] =
      await Promise.all([
        db.comment.count({ where: { deletedAt: { lt: softDeleteBefore } } }),
        db.episode.count({ where: { deletedAt: { lt: softDeleteBefore } } }),
        db.series.count({ where: { deletedAt: { lt: softDeleteBefore } } }),
        db.user.count({ where: { deletedAt: { lt: softDeleteBefore } } }),
        db.session.count({ where: { expires: { lt: sessionBefore } } }),
        db.notification.count({
          where: { createdAt: { lt: softDeleteBefore } },
        }),
        db.verificationToken.count({ where: { expires: { lt: input.now } } }),
      ])
    const candidates =
      comments + episodes + series + users + sessions + notifications + tokens
    if (input.dryRun || candidates === 0) return { candidates, deleted: 0 }

    let remaining = input.limit
    let deleted = 0
    const take = (): number => Math.max(0, remaining)
    const commentRows = await db.comment.findMany({
      where: { deletedAt: { lt: softDeleteBefore } },
      select: { id: true },
      take: take(),
    })
    if (commentRows.length > 0) {
      deleted += (
        await db.comment.deleteMany({
          where: { id: { in: commentRows.map((row) => row.id) } },
        })
      ).count
      remaining = input.limit - deleted
    }
    const episodeRows = await db.episode.findMany({
      where: { deletedAt: { lt: softDeleteBefore } },
      select: { id: true },
      take: take(),
    })
    if (episodeRows.length > 0) {
      deleted += (
        await db.episode.deleteMany({
          where: { id: { in: episodeRows.map((row) => row.id) } },
        })
      ).count
      remaining = input.limit - deleted
    }
    const seriesRows = await db.series.findMany({
      where: { deletedAt: { lt: softDeleteBefore } },
      select: { id: true },
      take: take(),
    })
    if (seriesRows.length > 0) {
      deleted += (
        await db.series.deleteMany({
          where: { id: { in: seriesRows.map((row) => row.id) } },
        })
      ).count
      remaining = input.limit - deleted
    }
    const userRows = await db.user.findMany({
      where: { deletedAt: { lt: softDeleteBefore } },
      select: { id: true },
      take: take(),
    })
    if (userRows.length > 0) {
      deleted += (
        await db.user.deleteMany({
          where: { id: { in: userRows.map((row) => row.id) } },
        })
      ).count
      remaining = input.limit - deleted
    }
    const sessionRows = await db.session.findMany({
      where: { expires: { lt: sessionBefore } },
      select: { id: true },
      take: take(),
    })
    if (sessionRows.length > 0) {
      deleted += (
        await db.session.deleteMany({
          where: { id: { in: sessionRows.map((row) => row.id) } },
        })
      ).count
      remaining = input.limit - deleted
    }
    const notificationRows = await db.notification.findMany({
      where: { createdAt: { lt: softDeleteBefore } },
      select: { id: true },
      take: take(),
    })
    if (notificationRows.length > 0) {
      deleted += (
        await db.notification.deleteMany({
          where: { id: { in: notificationRows.map((row) => row.id) } },
        })
      ).count
      remaining = input.limit - deleted
    }
    const tokenRows = await db.verificationToken.findMany({
      where: { expires: { lt: input.now } },
      select: { token: true },
      take: take(),
    })
    if (tokenRows.length > 0) {
      deleted += (
        await db.verificationToken.deleteMany({
          where: { token: { in: tokenRows.map((row) => row.token) } },
        })
      ).count
    }
    return { candidates, deleted }
  })
}
