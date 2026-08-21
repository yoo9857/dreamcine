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
        ...(cursor === null
          ? {}
          : {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: options.limit + 1,
    })
    const hasNext = rows.length > options.limit
    const pageRows = hasNext ? rows.slice(0, options.limit) : rows
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
