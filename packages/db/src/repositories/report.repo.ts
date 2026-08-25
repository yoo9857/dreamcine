import type {
  Page,
  Report,
  ReportReason,
  ReportStatus,
  ReportTarget,
} from '@aidream/core'
import { AppError } from '@aidream/core'
import { db } from '../client.js'
import { decodeCursor, encodeCursor } from '../cursor.js'
import { executeDb } from '../errors.js'
import { mapReport } from '../mappers/report.mapper.js'

export interface CreateReportData {
  reporterId: string
  target: ReportTarget
  targetId: string
  reason: ReportReason
  detail?: string | null
}

export interface ReportTargetContext {
  ownerId: string
  createdAt: Date
}

export interface OpenReportStats {
  reportCount: number
  distinctReporters: number
}

export interface ReportTargetPreview {
  title: string
  body: string | null
  imageKey: string | null
  ownerId: string
  ownerHandle: string
  ownerDisplayName: string
  reportCount: number
  reasonCounts: Partial<Record<ReportReason, number>>
}

function dateCursor(cursor: string): { createdAt: Date; id: string } {
  const payload = decodeCursor(cursor)
  if (typeof payload.k !== 'string') {
    throw new AppError('E_FEED_INVALID_CURSOR')
  }
  const createdAt = new Date(payload.k)
  if (Number.isNaN(createdAt.getTime())) {
    throw new AppError('E_FEED_INVALID_CURSOR')
  }
  return { createdAt, id: payload.id }
}

export function findReportById(id: string): Promise<Report | null> {
  return executeDb(async () => {
    const row = await db.report.findUnique({ where: { id } })
    return row === null ? null : mapReport(row)
  })
}

export function claimReportForReview(id: string): Promise<Report> {
  return executeDb(async () => {
    const claimed = await db.report.updateMany({
      where: { id, status: 'OPEN' },
      data: { status: 'REVIEWING' },
    })
    if (claimed.count === 0) {
      const exists = await db.report.count({ where: { id } })
      throw new AppError(
        exists === 0 ? 'E_REPORT_NOT_FOUND' : 'E_REPORT_ALREADY_RESOLVED',
      )
    }
    return mapReport(await db.report.findUniqueOrThrow({ where: { id } }))
  })
}

export function findReportByReporterAndTarget(input: {
  reporterId: string
  target: ReportTarget
  targetId: string
}): Promise<Report | null> {
  return executeDb(async () => {
    const row = await db.report.findUnique({
      where: {
        reporterId_target_targetId: input,
      },
    })
    return row === null ? null : mapReport(row)
  })
}

export function findReportTargetContext(
  target: ReportTarget,
  targetId: string,
): Promise<ReportTargetContext | null> {
  return executeDb(async () => {
    switch (target) {
      case 'EPISODE': {
        const row = await db.episode.findUnique({
          where: { id: targetId },
          select: { createdAt: true, series: { select: { ownerId: true } } },
        })
        return row === null
          ? null
          : { ownerId: row.series.ownerId, createdAt: row.createdAt }
      }
      case 'SERIES': {
        const row = await db.series.findUnique({
          where: { id: targetId },
          select: { ownerId: true, createdAt: true },
        })
        return row
      }
      case 'COMMENT': {
        const row = await db.comment.findUnique({
          where: { id: targetId },
          select: { userId: true, createdAt: true },
        })
        return row === null
          ? null
          : { ownerId: row.userId, createdAt: row.createdAt }
      }
      case 'USER': {
        const row = await db.user.findUnique({
          where: { id: targetId },
          select: { id: true, createdAt: true },
        })
        return row === null
          ? null
          : { ownerId: row.id, createdAt: row.createdAt }
      }
    }
  })
}

export function countOpenReports(
  target: ReportTarget,
  targetId: string,
): Promise<OpenReportStats> {
  return executeDb(async () => {
    const where = { target, targetId, status: 'OPEN' as const }
    const [reportCount, reporters] = await Promise.all([
      db.report.count({ where }),
      db.report.groupBy({ by: ['reporterId'], where }),
    ])
    return { reportCount, distinctReporters: reporters.length }
  })
}

export function getReportTargetPreview(
  target: ReportTarget,
  targetId: string,
): Promise<ReportTargetPreview | null> {
  return executeDb(async () => {
    const [reasonRows, preview] = await Promise.all([
      db.report.groupBy({
        by: ['reason'],
        where: { target, targetId },
        _count: { _all: true },
      }),
      (async () => {
        switch (target) {
          case 'EPISODE': {
            const row = await db.episode.findUnique({
              where: { id: targetId },
              select: {
                title: true,
                description: true,
                thumbKey: true,
                series: {
                  select: {
                    owner: {
                      select: { id: true, handle: true, displayName: true },
                    },
                  },
                },
              },
            })
            return row === null
              ? null
              : {
                  title: row.title,
                  body: row.description,
                  imageKey: row.thumbKey,
                  owner: row.series.owner,
                }
          }
          case 'SERIES': {
            const row = await db.series.findUnique({
              where: { id: targetId },
              select: {
                title: true,
                synopsis: true,
                posterKey: true,
                owner: {
                  select: { id: true, handle: true, displayName: true },
                },
              },
            })
            return row === null
              ? null
              : {
                  title: row.title,
                  body: row.synopsis,
                  imageKey: row.posterKey,
                  owner: row.owner,
                }
          }
          case 'COMMENT': {
            const row = await db.comment.findUnique({
              where: { id: targetId },
              select: {
                body: true,
                user: {
                  select: { id: true, handle: true, displayName: true },
                },
              },
            })
            return row === null
              ? null
              : {
                  title: '댓글',
                  body: row.body,
                  imageKey: null,
                  owner: row.user,
                }
          }
          case 'USER': {
            const row = await db.user.findUnique({
              where: { id: targetId },
              select: {
                id: true,
                handle: true,
                displayName: true,
                bio: true,
                avatarKey: true,
              },
            })
            return row === null
              ? null
              : {
                  title: `@${row.handle}`,
                  body: row.bio,
                  imageKey: row.avatarKey,
                  owner: row,
                }
          }
        }
      })(),
    ])
    if (preview === null) return null
    return {
      title: preview.title,
      body: preview.body,
      imageKey: preview.imageKey,
      ownerId: preview.owner.id,
      ownerHandle: preview.owner.handle,
      ownerDisplayName: preview.owner.displayName,
      reportCount: reasonRows.reduce((sum, row) => sum + row._count._all, 0),
      reasonCounts: Object.fromEntries(
        reasonRows.map((row) => [row.reason, row._count._all]),
      ),
    }
  })
}

export function setReportAutomaticState(
  id: string,
  patch: { priorityFlag?: boolean; autoHidden?: boolean },
): Promise<Report> {
  return executeDb(async () =>
    mapReport(await db.report.update({ where: { id }, data: patch })),
  )
}

export function setModerationTargetHidden(
  target: ReportTarget,
  targetId: string,
  hidden: boolean,
): Promise<void> {
  return executeDb(async () => {
    switch (target) {
      case 'EPISODE':
        await db.episode.updateMany({
          where: {
            id: targetId,
            status: hidden ? 'PUBLISHED' : 'HIDDEN',
          },
          data: { status: hidden ? 'HIDDEN' : 'PUBLISHED' },
        })
        return
      case 'COMMENT':
        await db.comment.update({
          where: { id: targetId },
          data: { isHidden: hidden },
        })
        return
      case 'SERIES':
        await db.episode.updateMany({
          where: {
            seriesId: targetId,
            status: hidden ? 'PUBLISHED' : 'HIDDEN',
          },
          data: { status: hidden ? 'HIDDEN' : 'PUBLISHED' },
        })
        return
      case 'USER':
        await db.episode.updateMany({
          where: {
            series: { ownerId: targetId },
            status: hidden ? 'PUBLISHED' : 'HIDDEN',
          },
          data: { status: hidden ? 'HIDDEN' : 'PUBLISHED' },
        })
    }
  })
}

export function removeModerationTarget(
  target: ReportTarget,
  targetId: string,
  now: Date,
): Promise<string[]> {
  return executeDb(async () =>
    db.$transaction(async (transaction) => {
      switch (target) {
        case 'EPISODE': {
          const episode = await transaction.episode.findUnique({
            where: { id: targetId },
            select: { assetId: true },
          })
          if (episode === null) throw new AppError('E_NOT_FOUND')
          await transaction.episode.updateMany({
            where: { id: targetId, status: { not: 'REMOVED' } },
            data: { status: 'REMOVED', deletedAt: now },
          })
          return episode.assetId === null ? [] : [episode.assetId]
        }
        case 'SERIES': {
          const episodes = await transaction.episode.findMany({
            where: { seriesId: targetId },
            select: { assetId: true },
          })
          await transaction.series.update({
            where: { id: targetId },
            data: { deletedAt: now },
          })
          await transaction.episode.updateMany({
            where: { seriesId: targetId, status: { not: 'REMOVED' } },
            data: { status: 'REMOVED', deletedAt: now },
          })
          return episodes.flatMap(({ assetId }) =>
            assetId === null ? [] : [assetId],
          )
        }
        case 'COMMENT':
          await transaction.comment.update({
            where: { id: targetId },
            data: { deletedAt: now, body: '', isHidden: true },
          })
          return []
        case 'USER':
          throw new AppError('E_PERM_DENIED')
      }
    }),
  )
}

export function createReport(input: CreateReportData): Promise<Report> {
  return executeDb(async () =>
    mapReport(await db.report.create({ data: input })),
  )
}

export function listReportsForReview(options: {
  status?: ReportStatus[]
  limit: number
  cursor?: string
}): Promise<Page<Report>> {
  return executeDb(async () => {
    const cursor =
      options.cursor === undefined ? null : dateCursor(options.cursor)
    const rows = await db.report.findMany({
      where: {
        ...(options.status === undefined
          ? {}
          : { status: { in: options.status } }),
      },
    })
    const severity = new Map<ReportReason, number>([
      ['MINOR_SAFETY', 0],
      ['SEXUAL', 1],
      ['COPYRIGHT', 2],
      ['VIOLENCE', 3],
      ['HATE', 3],
      ['SPAM', 3],
      ['OTHER', 3],
    ])
    rows.sort((left, right) => {
      if (left.priorityFlag !== right.priorityFlag)
        return left.priorityFlag ? -1 : 1
      const reasonOrder =
        (severity.get(left.reason) ?? 3) - (severity.get(right.reason) ?? 3)
      if (reasonOrder !== 0) return reasonOrder
      const timeOrder = left.createdAt.getTime() - right.createdAt.getTime()
      return timeOrder === 0 ? left.id.localeCompare(right.id) : timeOrder
    })
    const start =
      cursor === null
        ? 0
        : Math.max(0, rows.findIndex((row) => row.id === cursor.id) + 1)
    const candidates = rows.slice(start, start + options.limit + 1)
    const hasNext = candidates.length > options.limit
    const pageRows = hasNext ? candidates.slice(0, options.limit) : candidates
    const last = pageRows.at(-1)
    return {
      items: pageRows.map(mapReport),
      nextCursor:
        hasNext && last !== undefined
          ? encodeCursor({ k: last.createdAt.toISOString(), id: last.id })
          : null,
    }
  })
}

export function resolveReportGroup(input: {
  reportId: string
  status: Extract<ReportStatus, 'ACTIONED' | 'REJECTED'>
  handledBy: string
  handledAt: Date
  actionNote?: string | null
}): Promise<Report> {
  return executeDb(async () =>
    db.$transaction(async (transaction) => {
      const selected = await transaction.report.findUnique({
        where: { id: input.reportId },
      })
      if (selected === null) throw new AppError('E_REPORT_NOT_FOUND')

      const claimed = await transaction.report.updateMany({
        where: {
          id: input.reportId,
          status: { in: ['OPEN', 'REVIEWING'] },
        },
        data: {
          status: input.status,
          handledBy: input.handledBy,
          handledAt: input.handledAt,
          ...(input.actionNote === undefined
            ? {}
            : { actionNote: input.actionNote }),
        },
      })
      if (claimed.count === 0) throw new AppError('E_REPORT_ALREADY_RESOLVED')

      await transaction.report.updateMany({
        where: {
          target: selected.target,
          targetId: selected.targetId,
          status: { in: ['OPEN', 'REVIEWING'] },
        },
        data: {
          status: input.status,
          handledBy: input.handledBy,
          handledAt: input.handledAt,
          ...(input.actionNote === undefined
            ? {}
            : { actionNote: input.actionNote }),
        },
      })
      const result = await transaction.report.findUniqueOrThrow({
        where: { id: input.reportId },
      })
      return mapReport(result)
    }),
  )
}

export function updateReportStatus(
  id: string,
  status: ReportStatus,
  patch: { handledBy: string; handledAt: Date; actionNote?: string | null },
): Promise<Report> {
  return executeDb(async () =>
    mapReport(
      await db.report.update({
        where: { id },
        data: { status, ...patch },
      }),
    ),
  )
}
