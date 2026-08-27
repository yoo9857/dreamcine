import { executeDb } from '../errors.js'
import { db } from '../client.js'

export interface AdminDashboardSnapshot {
  readonly totals: {
    readonly users: number
    readonly creators: number
    readonly publishedEpisodes: number
    readonly totalViews: string
  }
  readonly attention: {
    readonly openReports: number
    readonly processingAssets: number
    readonly failedAssets: number
    readonly creatorApplications: number
  }
  readonly growth: readonly {
    readonly date: string
    readonly users: number
  }[]
  readonly previousWeekUsers: number
  readonly periodDays: number
  readonly episodeStatus: readonly {
    readonly status: string
    readonly count: number
  }[]
  readonly recentUsers: readonly {
    readonly id: string
    readonly handle: string
    readonly displayName: string
    readonly email: string
    readonly role: string
    readonly status: string
    readonly createdAt: Date
  }[]
  readonly topEpisodes: readonly {
    readonly id: string
    readonly title: string
    readonly seriesTitle: string
    readonly viewCount: string
    readonly likeCount: number
  }[]
}

function startOfDay(date: Date): Date {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

export function getAdminDashboardSnapshot(
  now = new Date(),
  periodDays = 7,
): Promise<AdminDashboardSnapshot> {
  return executeDb(async () => {
    const today = startOfDay(now)
    const safePeriod = periodDays === 30 ? 30 : 7
    const periodStart = new Date(today)
    periodStart.setDate(today.getDate() - (safePeriod * 2 - 1))

    const [
      users,
      creators,
      publishedEpisodes,
      views,
      openReports,
      processingAssets,
      failedAssets,
      creatorApplications,
      recentGrowth,
      episodeStatusRows,
      recentUsers,
      topEpisodes,
    ] = await Promise.all([
      db.user.count({ where: { deletedAt: null } }),
      db.user.count({
        where: {
          deletedAt: null,
          status: 'ACTIVE',
          role: { in: ['CREATOR', 'PARTNER'] },
        },
      }),
      db.episode.count({
        where: { deletedAt: null, status: 'PUBLISHED' },
      }),
      db.episode.aggregate({
        where: { deletedAt: null },
        _sum: { viewCount: true },
      }),
      db.report.count({ where: { status: { in: ['OPEN', 'REVIEWING'] } } }),
      db.videoAsset.count({
        where: { status: { in: ['PENDING', 'PROBING', 'TRANSCODING'] } },
      }),
      db.videoAsset.count({ where: { status: 'FAILED' } }),
      db.creatorApplication.count({
        where: { status: { in: ['SUBMITTED', 'REVIEWING'] } },
      }),
      db.user.findMany({
        where: { deletedAt: null, createdAt: { gte: periodStart } },
        select: { createdAt: true },
      }),
      db.episode.groupBy({
        by: ['status'],
        where: { deletedAt: null },
        _count: { _all: true },
      }),
      db.user.findMany({
        where: { deletedAt: null },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: 6,
        select: {
          id: true,
          handle: true,
          displayName: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
        },
      }),
      db.episode.findMany({
        where: { deletedAt: null, status: 'PUBLISHED' },
        orderBy: [{ viewCount: 'desc' }, { publishedAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          title: true,
          viewCount: true,
          likeCount: true,
          series: { select: { title: true } },
        },
      }),
    ])

    const days = Array.from({ length: safePeriod * 2 }, (_, index) => {
      const date = new Date(periodStart)
      date.setDate(periodStart.getDate() + index)
      return date
    })
    const growth = days.map((date) => {
      const key = date.toISOString().slice(0, 10)
      return {
        date: key,
        users: recentGrowth.filter(
          (item) => item.createdAt.toISOString().slice(0, 10) === key,
        ).length,
      }
    })

    return {
      totals: {
        users,
        creators,
        publishedEpisodes,
        totalViews: (views._sum.viewCount ?? 0n).toString(),
      },
      attention: {
        openReports,
        processingAssets,
        failedAssets,
        creatorApplications,
      },
      growth: growth.slice(safePeriod),
      previousWeekUsers: growth
        .slice(0, safePeriod)
        .reduce((sum, item) => sum + item.users, 0),
      periodDays: safePeriod,
      episodeStatus: episodeStatusRows.map((item) => ({
        status: item.status,
        count: item._count._all,
      })),
      recentUsers,
      topEpisodes: topEpisodes.map((episode) => ({
        id: episode.id,
        title: episode.title,
        seriesTitle: episode.series.title,
        viewCount: episode.viewCount.toString(),
        likeCount: episode.likeCount,
      })),
    }
  })
}
