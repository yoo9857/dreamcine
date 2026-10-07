import { randomUUID } from 'node:crypto'
import { beforeAll, afterAll, describe, expect, it } from 'vitest'

const testUrl = process.env.DATA_INTEGRITY_TEST_DATABASE_URL
describe.skipIf(testUrl === undefined)(
  'PostgreSQL moderation and persistence',
  () => {
    let repo: typeof import('../index.js')
    let db: (typeof import('../client.js'))['db']
    const now = new Date('2026-10-07T00:00:00Z')
    let adminId: string
    let moderatorId: string
    let reporterId: string
    beforeAll(async () => {
      // Explicit isolated database only. Never reuse DATABASE_URL from production.
      if (
        testUrl === undefined ||
        new URL(testUrl).pathname !== '/ilog_moderation_qa'
      )
        throw new Error('An isolated ilog_moderation_qa database is required')
      process.env.DATABASE_URL = testUrl
      repo = await import('../index.js')
      db = (await import('../client.js')).db
      adminId = (await user('ADMIN')).id
      moderatorId = (await user('MODERATOR')).id
      reporterId = (await user()).id
    })
    afterAll(async () => {
      await db.$disconnect()
    })
    async function user(
      role: 'ADMIN' | 'MODERATOR' | 'CREATOR' | 'VIEWER' = 'CREATOR',
    ) {
      const handle = 'qa' + randomUUID().replaceAll('-', '')
      return db.user.create({
        data: {
          handle,
          email: handle + '@example.test',
          displayName: handle,
          role,
          emailVerified: now,
        },
      })
    }
    async function content() {
      const owner = await user()
      const series = await db.series.create({
        data: { ownerId: owner.id, slug: randomUUID(), title: 'QA' },
      })
      const published = await db.episode.create({
        data: {
          seriesId: series.id,
          number: 1,
          title: 'Published',
          status: 'PUBLISHED',
        },
      })
      const draft = await db.episode.create({
        data: { seriesId: series.id, number: 2, title: 'Draft' },
      })
      return { owner, series, published, draft }
    }
    async function report(targetId: string, reporter = reporterId) {
      return db.report.create({
        data: {
          reporterId: reporter,
          target: 'EPISODE',
          targetId,
          reason: 'OTHER',
          detail: 'evidence retained',
        },
      })
    }
    it.each([1, 3, 7, 15, null] as const)(
      'suspension duration %s preserves drafts, revokes sessions, and expires correctly',
      async (days) => {
        const c = await content()
        await repo.createAuthSession({
          userId: c.owner.id,
          sessionToken: randomUUID(),
          expires: new Date('2030-01-01'),
        })
        expect(
          await db.authAuditLog.count({
            where: { userId: c.owner.id, kind: 'LOGIN_SUCCESS' },
          }),
        ).toBe(1)
        await repo.applyUserSanction({
          actorId: adminId,
          userId: c.owner.id,
          status: 'SUSPENDED',
          reason: 'verified violation',
          durationDays: days,
          now,
        })
        const suspended = await db.user.findUniqueOrThrow({
          where: { id: c.owner.id },
        })
        expect(suspended.suspendedUntil).toEqual(
          days === null ? null : new Date(now.getTime() + days * 86400000),
        )
        expect(await db.session.count({ where: { userId: c.owner.id } })).toBe(
          0,
        )
        expect(
          (await db.episode.findUniqueOrThrow({ where: { id: c.draft.id } }))
            .status,
        ).toBe('DRAFT')
        expect(
          (
            await db.episode.findUniqueOrThrow({
              where: { id: c.published.id },
            })
          ).status,
        ).toBe('PUBLISHED')
        expect(await repo.findPlaybackEpisode(c.published.id)).toBeNull()
        await expect(
          repo.createAuthSession({
            userId: c.owner.id,
            sessionToken: randomUUID(),
            expires: new Date('2030-01-01'),
          }),
        ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
        expect(
          await repo.releaseExpiredSuspensions(
            new Date(now.getTime() + (days ?? 100) * 86400000 - 1),
            c.owner.id,
          ),
        ).toBe(0)
        expect(
          await repo.releaseExpiredSuspensions(
            new Date(now.getTime() + (days ?? 100) * 86400000),
            c.owner.id,
          ),
        ).toBe(days === null ? 0 : 1)
        expect(
          await repo.releaseExpiredSuspensions(
            new Date('2027-01-01'),
            c.owner.id,
          ),
        ).toBe(0)
        expect(
          await db.moderationAction.count({
            where: { subjectId: c.owner.id, action: 'EXPIRED' },
          }),
        ).toBe(days === null ? 0 : 1)
        if (days !== null)
          expect(await repo.findPlaybackEpisode(c.published.id)).not.toBeNull()
      },
    )
    it('warnings preserve status and persist operator, evidence, and grouped reports', async () => {
      const c = await content()
      const r = await report(c.published.id)
      const other = await user()
      const r2 = await report(c.published.id, other.id)
      const result = await repo.applyReportDecision({
        actorId: moderatorId,
        reportId: r.id,
        decision: { action: 'WARN_USER', note: 'verified violation' },
        now,
      })
      const action = await db.moderationAction.findUniqueOrThrow({
        where: { id: result.actionId },
      })
      expect(action.reportIds.sort()).toEqual([r.id, r2.id].sort())
      expect(action.actorId).toBe(moderatorId)
      expect(JSON.stringify(action.evidence)).toContain('evidence retained')
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: c.owner.id } })).status,
      ).toBe('ACTIVE')
      expect(
        await db.report.count({
          where: { id: { in: [r.id, r2.id] }, status: 'ACTIONED' },
        }),
      ).toBe(2)
      expect(
        await db.notification.count({
          where: { userId: c.owner.id, type: 'MODERATION' },
        }),
      ).toBe(1)
    })
    it('concurrent decisions for the same target commit exactly one sanction', async () => {
      const c = await content()
      const r = await report(c.published.id)
      const other = await user()
      const r2 = await report(c.published.id, other.id)
      const results = await Promise.allSettled(
        [r, r2].map((row) =>
          repo.applyReportDecision({
            actorId: adminId,
            reportId: row.id,
            decision: {
              action: 'SUSPEND_USER',
              note: 'confirmed violation',
              durationDays: 3,
            },
            now,
          }),
        ),
      )
      expect(results.filter((x) => x.status === 'fulfilled')).toHaveLength(1)
      expect(
        await db.moderationAction.count({ where: { subjectId: c.owner.id } }),
      ).toBe(1)
      expect(
        await db.report.count({
          where: { targetId: c.published.id, status: 'ACTIONED' },
        }),
      ).toBe(2)
    })
    it('failed validation or unauthorized sanctions leave reports and accounts untouched', async () => {
      const c = await content()
      const r = await report(c.published.id)
      await expect(
        repo.applyReportDecision({
          actorId: adminId,
          reportId: r.id,
          decision: { action: 'SUSPEND_USER', note: 'violation' },
        }),
      ).rejects.toMatchObject({ code: 'E_VALIDATION' })
      await expect(
        repo.applyReportDecision({
          actorId: moderatorId,
          reportId: r.id,
          decision: {
            action: 'SUSPEND_USER',
            note: 'violation',
            durationDays: 3,
          },
        }),
      ).rejects.toMatchObject({ code: 'E_PERM_DENIED' })
      expect(
        (await db.report.findUniqueOrThrow({ where: { id: r.id } })).status,
      ).toBe('OPEN')
      expect(
        (await db.user.findUniqueOrThrow({ where: { id: c.owner.id } })).status,
      ).toBe('ACTIVE')
      expect(
        await db.moderationAction.count({ where: { subjectId: c.owner.id } }),
      ).toBe(0)
      expect(
        await db.notification.count({ where: { userId: c.owner.id } }),
      ).toBe(0)
    })
    it('rejecting a report never republishes hidden content', async () => {
      const c = await content()
      await db.episode.update({
        where: { id: c.published.id },
        data: { status: 'HIDDEN' },
      })
      const r = await report(c.published.id)
      await db.report.update({
        where: { id: r.id },
        data: { autoHidden: true },
      })
      await repo.applyReportDecision({
        actorId: moderatorId,
        reportId: r.id,
        decision: { action: 'REJECT' },
      })
      expect(
        (await db.episode.findUniqueOrThrow({ where: { id: c.published.id } }))
          .status,
      ).toBe('HIDDEN')
    })
    it('removing a comment retains evidence and reconciles the comment count', async () => {
      const c = await content()
      const comment = await db.comment.create({
        data: {
          userId: c.owner.id,
          episodeId: c.published.id,
          body: 'original evidence',
        },
      })
      await db.episode.update({
        where: { id: c.published.id },
        data: { commentCount: 1 },
      })
      const r = await db.report.create({
        data: {
          reporterId,
          target: 'COMMENT',
          targetId: comment.id,
          reason: 'OTHER',
        },
      })
      const result = await repo.applyReportDecision({
        actorId: adminId,
        reportId: r.id,
        decision: { action: 'REMOVE_CONTENT', note: 'violation' },
      })
      expect(
        (await db.episode.findUniqueOrThrow({ where: { id: c.published.id } }))
          .commentCount,
      ).toBe(0)
      expect(
        (await db.comment.findUniqueOrThrow({ where: { id: comment.id } }))
          .body,
      ).toBe('')
      expect(
        JSON.stringify(
          (
            await db.moderationAction.findUniqueOrThrow({
              where: { id: result.actionId },
            })
          ).evidence,
        ),
      ).toContain('original evidence')
    })
    it('concurrent upload completion creates one linked asset and aborted uploads stay aborted', async () => {
      const owner = await user()
      const makeUpload = (status: 'UPLOADING' | 'ABORTED') =>
        db.uploadSession.create({
          data: {
            userId: owner.id,
            status,
            fileName: 'qa.mp4',
            fileSize: 1024n,
            mimeType: 'video/mp4',
            objectKey: 'originals/' + randomUUID(),
            partSize: 1024,
            totalParts: 1,
            expiresAt: new Date('2030-01-01'),
          },
        })
      const upload = await makeUpload('UPLOADING')
      const assets = await Promise.all(
        [1, 2].map(() =>
          repo.finalizeUploadAsset({
            uploadId: upload.id,
            originalKey: upload.objectKey,
            sizeBytes: 1024n,
          }),
        ),
      )
      expect(assets[0]?.id).toBe(assets[1]?.id)
      expect(
        await db.videoAsset.count({ where: { uploadId: upload.id } }),
      ).toBe(1)
      expect(
        (await db.uploadSession.findUniqueOrThrow({ where: { id: upload.id } }))
          .status,
      ).toBe('UPLOADED')
      const aborted = await makeUpload('ABORTED')
      await expect(
        repo.finalizeUploadAsset({
          uploadId: aborted.id,
          originalKey: aborted.objectKey,
          sizeBytes: 1024n,
        }),
      ).rejects.toMatchObject({ code: 'E_UPLOAD_ABORTED' })
      expect(
        await db.videoAsset.count({ where: { uploadId: aborted.id } }),
      ).toBe(0)
    })
    it('image registry and poster link commit together and reject mismatched ownership', async () => {
      const c = await content()
      const image = {
        ownerId: c.owner.id,
        objectKey: 'thumbs/' + randomUUID(),
        contentType: 'image/webp',
        sizeBytes: 1024n,
        sha256: 'a'.repeat(64),
      }
      await repo.attachSeriesPoster(c.series.id, image)
      expect(
        (await db.series.findUniqueOrThrow({ where: { id: c.series.id } }))
          .posterKey,
      ).toBe(image.objectKey)
      expect(
        (
          await db.storedImage.findUniqueOrThrow({
            where: { objectKey: image.objectKey },
          })
        ).status,
      ).toBe('READY')
      const wrong = {
        ...image,
        ownerId: reporterId,
        objectKey: 'thumbs/' + randomUUID(),
      }
      await expect(
        repo.attachSeriesPoster(c.series.id, wrong),
      ).rejects.toMatchObject({ code: 'E_PERM_NOT_OWNER' })
      expect(
        await db.storedImage.findUnique({
          where: { objectKey: wrong.objectKey },
        }),
      ).toBeNull()
    })
  },
)
