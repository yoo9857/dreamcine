import {
  AppError,
  can,
  type ReportTarget,
  type ReviewReportInput,
} from '@aidream/core'
import type { Prisma } from '@prisma/client'
import { db } from '../client.js'
import { executeDb } from '../errors.js'
import { mapReport } from '../mappers/report.mapper.js'
import { withTransaction, type TransactionClient } from '../tx.js'
import { createNotificationInTransaction } from './notification.repo.js'

export type SuspensionDays = 1 | 3 | 7 | 15 | null

function expiresAfter(
  days: SuspensionDays | undefined,
  now: Date,
): Date | null {
  if (days === undefined || (days !== null && ![1, 3, 7, 15].includes(days)))
    throw new AppError('E_VALIDATION', { field: 'durationDays' })
  return days === null ? null : new Date(now.getTime() + days * 86_400_000)
}

async function staff(
  tx: TransactionClient,
  actorId: string,
  capability: 'report.review' | 'user.suspend',
) {
  const actor = await tx.user.findFirst({
    where: { id: actorId, deletedAt: null },
  })
  if (
    actor === null ||
    !can(
      {
        id: actor.id,
        role: actor.role,
        status: actor.status,
        emailVerified: actor.emailVerified !== null,
      },
      capability,
    )
  )
    throw new AppError('E_PERM_DENIED')
  return actor
}

async function lockUser(tx: TransactionClient, id: string) {
  await tx.$queryRaw`SELECT id FROM "user" WHERE id = ${id} FOR UPDATE`
  const user = await tx.user.findFirst({ where: { id, deletedAt: null } })
  if (user === null) throw new AppError('E_USER_NOT_FOUND')
  return user
}

function protectSubject(actorId: string, user: { id: string; role: string }) {
  if (actorId === user.id) throw new AppError('E_USER_SELF_ACTION')
  if (user.role === 'ADMIN' || user.role === 'MODERATOR')
    throw new AppError('E_PERM_DENIED')
}

async function changeStatus(
  tx: TransactionClient,
  userId: string,
  status: 'ACTIVE' | 'SUSPENDED',
  reason: string,
  until: Date | null,
  now: Date,
) {
  await tx.user.update({
    where: { id: userId },
    data: {
      status,
      suspendedUntil: until,
      suspendReason: status === 'ACTIVE' ? null : reason,
    },
  })
  if (status === 'SUSPENDED') {
    await tx.session.deleteMany({ where: { userId } })
    // Content keeps its draft/published state; public readers reject suspended owners.
    await tx.uploadSession.updateMany({
      where: { userId, status: { in: ['CREATED', 'UPLOADING'] } },
      data: { status: 'ABORTED' },
    })
  }
  await tx.authAuditLog.create({
    data: {
      userId,
      kind: status === 'ACTIVE' ? 'REACTIVATED' : 'SUSPENDED',
      detail: reason.slice(0, 500),
      createdAt: now,
    },
  })
}

function userState(user: {
  status: string
  suspendedUntil: Date | null
  suspendReason: string | null
}): Prisma.InputJsonObject {
  return {
    status: user.status,
    suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
    suspendReason: user.suspendReason,
  }
}

export function applyUserSanction(input: {
  actorId: string
  userId: string
  status: 'WARNING' | 'ACTIVE' | 'SUSPENDED'
  reason: string
  durationDays?: SuspensionDays
  now?: Date
}) {
  return withTransaction(async (tx) => {
    const now = input.now ?? new Date()
    const actor = await staff(tx, input.actorId, 'user.suspend')
    const user = await lockUser(tx, input.userId)
    protectSubject(actor.id, user)
    const reason = input.reason.trim()
    if (!reason || reason.length > 1000)
      throw new AppError('E_VALIDATION', { field: 'reason' })
    const until =
      input.status === 'SUSPENDED'
        ? expiresAfter(input.durationDays, now)
        : null
    if (input.status !== 'SUSPENDED' && input.durationDays !== undefined)
      throw new AppError('E_VALIDATION', { field: 'durationDays' })
    const before = userState(user)
    if (input.status !== 'WARNING')
      await changeStatus(tx, user.id, input.status, reason, until, now)
    const after =
      input.status === 'WARNING'
        ? before
        : {
            status: input.status,
            suspendedUntil: until?.toISOString() ?? null,
            suspendReason: input.status === 'ACTIVE' ? null : reason,
          }
    const action = await tx.moderationAction.create({
      data: {
        actorId: actor.id,
        actorHandle: actor.handle,
        subjectId: user.id,
        subjectHandle: user.handle,
        target: 'USER',
        targetId: user.id,
        action: input.status,
        reason,
        beforeState: before,
        afterState: after,
        expiresAt: until,
        createdAt: now,
      },
    })
    await createNotificationInTransaction(tx, {
      userId: user.id,
      payload: {
        type: 'MODERATION',
        targetType: 'USER',
        targetId: user.id,
        action: input.status,
        reason,
        expiresAt: until?.toISOString() ?? null,
      },
    })
    return action
  })
}

async function targetSnapshot(
  tx: TransactionClient,
  target: ReportTarget,
  id: string,
) {
  switch (target) {
    case 'USER': {
      const row = await tx.user.findFirst({ where: { id, deletedAt: null } })
      return row === null
        ? null
        : { ownerId: row.id, evidence: { handle: row.handle, bio: row.bio } }
    }
    case 'COMMENT': {
      const row = await tx.comment.findUnique({
        where: { id },
        select: { userId: true, body: true, isHidden: true, deletedAt: true },
      })
      return row === null
        ? null
        : {
            ownerId: row.userId,
            evidence: {
              body: row.body,
              isHidden: row.isHidden,
              deletedAt: row.deletedAt?.toISOString() ?? null,
            },
          }
    }
    case 'SERIES': {
      const row = await tx.series.findUnique({
        where: { id },
        select: { ownerId: true, title: true, synopsis: true },
      })
      return row === null
        ? null
        : {
            ownerId: row.ownerId,
            evidence: { title: row.title, synopsis: row.synopsis },
          }
    }
    case 'EPISODE': {
      const row = await tx.episode.findUnique({
        where: { id },
        select: {
          title: true,
          description: true,
          status: true,
          series: { select: { ownerId: true } },
        },
      })
      return row === null
        ? null
        : {
            ownerId: row.series.ownerId,
            evidence: {
              title: row.title,
              description: row.description,
              status: row.status,
            },
          }
    }
  }
}

export function applyReportDecision(input: {
  actorId: string
  reportId: string
  decision: ReviewReportInput
  now?: Date
}) {
  return withTransaction(async (tx) => {
    const now = input.now ?? new Date()
    const actor = await staff(tx, input.actorId, 'report.review')
    const first = await tx.report.findUnique({ where: { id: input.reportId } })
    if (first === null) throw new AppError('E_REPORT_NOT_FOUND')
    // Same target may have many reports. Serialize the entire case, not one report row.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${first.target}:${first.targetId}`}, 0))::text`
    const selected = await tx.report.findUniqueOrThrow({
      where: { id: input.reportId },
    })
    if (selected.status !== 'OPEN' && selected.status !== 'REVIEWING')
      throw new AppError('E_REPORT_ALREADY_RESOLVED')
    const target = await targetSnapshot(tx, selected.target, selected.targetId)
    if (target === null) throw new AppError('E_NOT_FOUND')
    const subject = await lockUser(tx, target.ownerId)
    const decision = input.decision
    if (decision.action !== 'REJECT') protectSubject(actor.id, subject)
    if (
      decision.action === 'SUSPEND_USER' ||
      decision.action === 'REMOVE_CONTENT'
    )
      await staff(tx, actor.id, 'user.suspend')
    const reason = decision.note?.trim() ?? ''
    if (
      reason.length > 1000 ||
      (decision.action !== 'SUSPEND_USER' &&
        decision.durationDays !== undefined)
    )
      throw new AppError('E_VALIDATION')
    if (decision.action !== 'REJECT' && !reason)
      throw new AppError('E_VALIDATION', { field: 'note' })
    const reports = await tx.report.findMany({
      where: {
        target: selected.target,
        targetId: selected.targetId,
        status: { in: ['OPEN', 'REVIEWING'] },
      },
      select: {
        id: true,
        reporterId: true,
        reason: true,
        detail: true,
        createdAt: true,
      },
    })
    const mediaIds: string[] = []
    let until: Date | null = null
    const before = userState(subject)
    switch (decision.action) {
      case 'WARN_USER':
        break
      case 'SUSPEND_USER':
        until = expiresAfter(decision.durationDays, now)
        await changeStatus(tx, subject.id, 'SUSPENDED', reason, until, now)
        break
      case 'HIDE_CONTENT':
        if (selected.target === 'COMMENT')
          await tx.comment.update({
            where: { id: selected.targetId },
            data: { isHidden: true },
          })
        else
          await tx.episode.updateMany({
            where: {
              deletedAt: null,
              status: 'PUBLISHED',
              ...(selected.target === 'EPISODE'
                ? { id: selected.targetId }
                : selected.target === 'SERIES'
                  ? { seriesId: selected.targetId }
                  : { series: { ownerId: subject.id } }),
            },
            data: { status: 'HIDDEN' },
          })
        break
      case 'REMOVE_CONTENT': {
        if (selected.target === 'USER') throw new AppError('E_PERM_DENIED')
        if (selected.target === 'COMMENT') {
          const comment = await tx.comment.update({
            where: { id: selected.targetId },
            data: { deletedAt: now, isHidden: true, body: '' },
          })
          const count = await tx.comment.count({
            where: { episodeId: comment.episodeId, deletedAt: null },
          })
          await tx.episode.update({
            where: { id: comment.episodeId },
            data: { commentCount: count },
          })
        } else {
          const where =
            selected.target === 'EPISODE'
              ? { id: selected.targetId }
              : { seriesId: selected.targetId }
          const episodes = await tx.episode.findMany({
            where: { ...where, deletedAt: null },
            select: { assetId: true },
          })
          mediaIds.push(
            ...episodes.flatMap((row) =>
              row.assetId === null ? [] : [row.assetId],
            ),
          )
          await tx.episode.updateMany({
            where,
            data: { status: 'REMOVED', deletedAt: now },
          })
          if (selected.target === 'SERIES')
            await tx.series.update({
              where: { id: selected.targetId },
              data: { deletedAt: now },
            })
        }
        break
      }
      case 'REJECT':
        break // A rejected report must never republish manually hidden content.
    }
    if (
      (decision.action === 'HIDE_CONTENT' ||
        decision.action === 'REMOVE_CONTENT') &&
      selected.target !== 'COMMENT'
    ) {
      const seriesRows = await tx.series.findMany({
        where: { ownerId: subject.id },
        select: { id: true },
      })
      for (const series of seriesRows) {
        const episodeCount = await tx.episode.count({
          where: { seriesId: series.id, status: 'PUBLISHED', deletedAt: null },
        })
        await tx.series.update({
          where: { id: series.id },
          data: { episodeCount },
        })
      }
      const seriesCount = await tx.series.count({
        where: { ownerId: subject.id, deletedAt: null },
      })
      await tx.user.update({ where: { id: subject.id }, data: { seriesCount } })
    }
    const after =
      decision.action === 'SUSPEND_USER'
        ? {
            status: 'SUSPENDED',
            suspendedUntil: until?.toISOString() ?? null,
            suspendReason: reason,
          }
        : before
    const action = await tx.moderationAction.create({
      data: {
        actorId: actor.id,
        actorHandle: actor.handle,
        subjectId: subject.id,
        subjectHandle: subject.handle,
        target: selected.target,
        targetId: selected.targetId,
        action: decision.action,
        reason: reason || '신고 기각',
        reportIds: reports.map((row) => row.id),
        pendingMediaIds: [...new Set(mediaIds)],
        evidence: {
          target: target.evidence,
          reports: reports.map((row) => ({
            ...row,
            createdAt: row.createdAt.toISOString(),
          })),
        },
        beforeState: { user: before, content: target.evidence },
        afterState: {
          user: after,
          content:
            (await targetSnapshot(tx, selected.target, selected.targetId))
              ?.evidence ?? null,
        },
        expiresAt: until,
        createdAt: now,
      },
    })
    await tx.report.updateMany({
      where: { id: { in: reports.map((row) => row.id) } },
      data: {
        status: decision.action === 'REJECT' ? 'REJECTED' : 'ACTIONED',
        handledBy: actor.id,
        handledAt: now,
        actionNote: `${decision.action}: ${reason || '신고 기각'}`.slice(
          0,
          1000,
        ),
      },
    })
    await createNotificationInTransaction(tx, {
      userId: subject.id,
      payload: {
        type: 'MODERATION',
        targetType: selected.target,
        targetId: selected.targetId,
        action: decision.action,
        reason,
        expiresAt: until?.toISOString() ?? null,
      },
    })
    return {
      report: mapReport(
        await tx.report.findUniqueOrThrow({ where: { id: input.reportId } }),
      ),
      actionId: action.id,
      assetIds: action.pendingMediaIds,
    }
  })
}

export function releaseExpiredSuspensions(now: Date, userId?: string) {
  return withTransaction(async (tx) => {
    const users = await tx.user.findMany({
      where: {
        ...(userId === undefined ? {} : { id: userId }),
        status: 'SUSPENDED',
        deletedAt: null,
        suspendedUntil: { lte: now },
      },
      orderBy: { suspendedUntil: 'asc' },
      take: 100,
    })
    let released = 0
    for (const row of users) {
      const user = await lockUser(tx, row.id)
      if (
        user.status !== 'SUSPENDED' ||
        user.suspendedUntil === null ||
        user.suspendedUntil > now
      )
        continue
      await changeStatus(tx, user.id, 'ACTIVE', '기간 정지 만료', null, now)
      await tx.moderationAction.create({
        data: {
          subjectId: user.id,
          subjectHandle: user.handle,
          target: 'USER',
          targetId: user.id,
          action: 'EXPIRED',
          reason: '기간 정지 만료',
          beforeState: userState(user),
          afterState: {
            status: 'ACTIVE',
            suspendedUntil: null,
            suspendReason: null,
          },
          createdAt: now,
        },
      })
      await createNotificationInTransaction(tx, {
        userId: user.id,
        payload: {
          type: 'MODERATION',
          targetType: 'USER',
          targetId: user.id,
          action: 'ACTIVE',
        },
      })
      released++
    }
    return released
  })
}

export function listPendingModerationMedia() {
  return executeDb(() =>
    db.moderationAction.findMany({
      where: {
        mediaQueuedAt: null,
        NOT: { pendingMediaIds: { isEmpty: true } },
      },
      orderBy: { createdAt: 'asc' },
      take: 100,
      select: { id: true, pendingMediaIds: true },
    }),
  )
}
export function markModerationMediaQueued(id: string) {
  return executeDb(() =>
    db.moderationAction.update({
      where: { id },
      data: { mediaQueuedAt: new Date() },
    }),
  )
}
export function listUserModerationHistory(userId: string) {
  return executeDb(() =>
    db.moderationAction.findMany({
      where: { subjectId: userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 30,
    }),
  )
}
