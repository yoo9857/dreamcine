import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { AppError } from '@aidream/core'
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)
const originalDatabaseUrl = process.env.DATABASE_URL
let container: StartedPostgreSqlContainer
let database: typeof import('../src/client.js').db
let repo: typeof import('../src/index.js')

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('aidream_t12')
    .withUsername('aidream_t12')
    .withPassword('aidream_t12_password')
    .start()
  process.env.DATABASE_URL = `postgresql://aidream_t12:aidream_t12_password@${container.getHost()}:${String(container.getMappedPort(5432))}/aidream_t12?schema=public`
  const executable =
    process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm'
  const prefix = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm'] : []
  await execFileAsync(
    executable,
    [
      ...prefix,
      'exec',
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma',
    ],
    { cwd: process.cwd(), env: process.env, windowsHide: true },
  )
  database = (await import('../src/client.js')).db
  repo = await import('../src/index.js')
}, 150_000)

beforeEach(async () => {
  await database.$executeRaw`TRUNCATE TABLE "user" CASCADE`
})

afterAll(async () => {
  await database.$disconnect()
  await container.stop()
  if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = originalDatabaseUrl
})

async function fixture() {
  const [owner, firstReporter, secondReporter] = await Promise.all([
    database.user.create({
      data: {
        handle: 'owner',
        email: 'owner@example.com',
        displayName: 'Owner',
        role: 'CREATOR',
      },
    }),
    database.user.create({
      data: {
        handle: 'reporter1',
        email: 'reporter1@example.com',
        displayName: 'Reporter 1',
      },
    }),
    database.user.create({
      data: {
        handle: 'reporter2',
        email: 'reporter2@example.com',
        displayName: 'Reporter 2',
      },
    }),
  ])
  const series = await database.series.create({
    data: { ownerId: owner.id, slug: 'moderation-series', title: 'Moderation' },
  })
  const episode = await database.episode.create({
    data: {
      seriesId: series.id,
      number: 1,
      title: 'Reported',
      status: 'PUBLISHED',
    },
  })
  return { owner, firstReporter, secondReporter, episode }
}

describe('moderation repository', () => {
  it('신고 집계와 우선순위 심사큐를 보존한다', async () => {
    const item = await fixture()
    const first = await repo.createReport({
      reporterId: item.firstReporter.id,
      target: 'EPISODE',
      targetId: item.episode.id,
      reason: 'OTHER',
    })
    await repo.createReport({
      reporterId: item.secondReporter.id,
      target: 'EPISODE',
      targetId: item.episode.id,
      reason: 'MINOR_SAFETY',
    })
    await repo.setReportAutomaticState(first.id, { priorityFlag: true })
    await expect(
      repo.countOpenReports('EPISODE', item.episode.id),
    ).resolves.toEqual({
      reportCount: 2,
      distinctReporters: 2,
    })
    const queue = await repo.listReportsForReview({
      limit: 10,
      status: ['OPEN'],
    })
    expect(queue.items[0]?.id).toBe(first.id)
  })

  it('동시 심사 선점은 한 요청만 성공한다', async () => {
    const item = await fixture()
    const report = await repo.createReport({
      reporterId: item.firstReporter.id,
      target: 'EPISODE',
      targetId: item.episode.id,
      reason: 'SPAM',
    })
    const results = await Promise.allSettled([
      repo.claimReportForReview(report.id),
      repo.claimReportForReview(report.id),
    ])
    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    )
    const rejection = results.find(({ status }) => status === 'rejected')
    expect(rejection?.status).toBe('rejected')
    if (rejection?.status === 'rejected') {
      expect(rejection.reason).toBeInstanceOf(AppError)
      expect((rejection.reason as AppError).code).toBe(
        'E_REPORT_ALREADY_RESOLVED',
      )
    }
  })

  it('계정 정지는 세션·콘텐츠·진행 업로드를 즉시 차단한다', async () => {
    const item = await fixture()
    await database.session.create({
      data: {
        sessionToken: 'active-session',
        userId: item.owner.id,
        expires: new Date('2030-01-01T00:00:00Z'),
      },
    })
    await database.uploadSession.create({
      data: {
        userId: item.owner.id,
        fileName: 'pending.mp4',
        fileSize: 100,
        mimeType: 'video/mp4',
        objectKey: 'originals/pending.mp4',
        partSize: 100,
        totalParts: 1,
        expiresAt: new Date('2030-01-01T00:00:00Z'),
      },
    })
    await repo.setUserModerationStatus(item.owner.id, 'SUSPENDED')
    const [user, sessionCount, episode, upload] = await Promise.all([
      database.user.findUniqueOrThrow({ where: { id: item.owner.id } }),
      database.session.count({ where: { userId: item.owner.id } }),
      database.episode.findUniqueOrThrow({ where: { id: item.episode.id } }),
      database.uploadSession.findFirstOrThrow({
        where: { userId: item.owner.id },
      }),
    ])
    expect(user.status).toBe('SUSPENDED')
    expect(sessionCount).toBe(0)
    expect(episode.status).toBe('HIDDEN')
    expect(upload.status).toBe('ABORTED')
  })

  it('모든 신고 대상의 실제 미리보기와 소유자를 조회한다', async () => {
    const item = await fixture()
    const comment = await database.comment.create({
      data: {
        episodeId: item.episode.id,
        userId: item.firstReporter.id,
        body: '신고된 댓글 본문',
      },
    })
    await Promise.all([
      repo.createReport({
        reporterId: item.firstReporter.id,
        target: 'EPISODE',
        targetId: item.episode.id,
        reason: 'VIOLENCE',
      }),
      repo.createReport({
        reporterId: item.secondReporter.id,
        target: 'COMMENT',
        targetId: comment.id,
        reason: 'HATE',
      }),
    ])
    const series = await database.series.findFirstOrThrow({
      where: { ownerId: item.owner.id },
    })
    const [episodePreview, seriesPreview, commentPreview, userPreview] =
      await Promise.all([
        repo.getReportTargetPreview('EPISODE', item.episode.id),
        repo.getReportTargetPreview('SERIES', series.id),
        repo.getReportTargetPreview('COMMENT', comment.id),
        repo.getReportTargetPreview('USER', item.owner.id),
      ])
    const contexts = await Promise.all([
      repo.findReportTargetContext('EPISODE', item.episode.id),
      repo.findReportTargetContext('SERIES', series.id),
      repo.findReportTargetContext('COMMENT', comment.id),
      repo.findReportTargetContext('USER', item.owner.id),
    ])
    expect(contexts.every((context) => context !== null)).toBe(true)
    expect(episodePreview).toMatchObject({
      title: 'Reported',
      ownerId: item.owner.id,
      reportCount: 1,
      reasonCounts: { VIOLENCE: 1 },
    })
    expect(seriesPreview).toMatchObject({
      title: 'Moderation',
      ownerId: item.owner.id,
    })
    expect(commentPreview).toMatchObject({
      title: '댓글',
      body: '신고된 댓글 본문',
      ownerId: item.firstReporter.id,
    })
    expect(userPreview).toMatchObject({
      title: '@owner',
      ownerId: item.owner.id,
    })
    await expect(
      repo.getReportTargetPreview('EPISODE', 'missing'),
    ).resolves.toBeNull()
  })

  it('대상별 숨김과 복원을 적용한다', async () => {
    const item = await fixture()
    const series = await database.series.findFirstOrThrow({
      where: { ownerId: item.owner.id },
    })
    const comment = await database.comment.create({
      data: {
        episodeId: item.episode.id,
        userId: item.firstReporter.id,
        body: '숨김 대상',
      },
    })
    for (const [target, targetId] of [
      ['EPISODE', item.episode.id],
      ['COMMENT', comment.id],
      ['SERIES', series.id],
      ['USER', item.owner.id],
    ] as const) {
      await repo.setModerationTargetHidden(target, targetId, true)
      await repo.setModerationTargetHidden(target, targetId, false)
    }
    const [episode, restoredComment] = await Promise.all([
      database.episode.findUniqueOrThrow({ where: { id: item.episode.id } }),
      database.comment.findUniqueOrThrow({ where: { id: comment.id } }),
    ])
    expect(episode.status).toBe('PUBLISHED')
    expect(restoredComment.isHidden).toBe(false)
  })

  it('신고 묶음을 한 번에 처리하고 커서로 사용자 검색을 이어간다', async () => {
    const item = await fixture()
    const first = await repo.createReport({
      reporterId: item.firstReporter.id,
      target: 'EPISODE',
      targetId: item.episode.id,
      reason: 'SPAM',
    })
    await repo.createReport({
      reporterId: item.secondReporter.id,
      target: 'EPISODE',
      targetId: item.episode.id,
      reason: 'SPAM',
    })
    await repo.claimReportForReview(first.id)
    await repo.resolveReportGroup({
      reportId: first.id,
      status: 'ACTIONED',
      handledBy: item.owner.id,
      handledAt: new Date(),
      actionNote: '일괄 처리',
    })
    expect(
      await database.report.count({
        where: { targetId: item.episode.id, status: 'ACTIONED' },
      }),
    ).toBe(2)

    const firstPage = await repo.listUsersForAdmin({
      limit: 1,
      query: 'reporter',
    })
    expect(firstPage.items).toHaveLength(1)
    expect(firstPage.nextCursor).not.toBeNull()
    if (firstPage.nextCursor === null) throw new Error('cursor missing')
    const secondPage = await repo.listUsersForAdmin({
      limit: 1,
      cursor: firstPage.nextCursor,
      query: 'reporter',
    })
    expect(secondPage.items).toHaveLength(1)
    expect(secondPage.items[0]?.id).not.toBe(firstPage.items[0]?.id)
  })

  it('콘텐츠 영구 삭제는 대상 상태를 바꾸고 사용자 대상은 거부한다', async () => {
    const item = await fixture()
    const comment = await database.comment.create({
      data: {
        episodeId: item.episode.id,
        userId: item.firstReporter.id,
        body: '삭제 대상',
      },
    })
    await expect(
      repo.removeModerationTarget('COMMENT', comment.id, new Date()),
    ).resolves.toEqual([])
    const deletedComment = await database.comment.findUniqueOrThrow({
      where: { id: comment.id },
    })
    expect(deletedComment.deletedAt).not.toBeNull()
    await expect(
      repo.removeModerationTarget('EPISODE', item.episode.id, new Date()),
    ).resolves.toEqual([])
    expect(
      (
        await database.episode.findUniqueOrThrow({
          where: { id: item.episode.id },
        })
      ).status,
    ).toBe('REMOVED')
    const series = await database.series.findFirstOrThrow({
      where: { ownerId: item.owner.id },
    })
    await expect(
      repo.removeModerationTarget('SERIES', series.id, new Date()),
    ).resolves.toEqual([])
    expect(
      (await database.series.findUniqueOrThrow({ where: { id: series.id } }))
        .deletedAt,
    ).not.toBeNull()
    await expect(
      repo.removeModerationTarget('USER', item.owner.id, new Date()),
    ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
  })
})
