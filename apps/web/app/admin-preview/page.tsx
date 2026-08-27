import type { AdminDashboardSnapshot } from '@aidream/db'
import { notFound } from 'next/navigation'

import { AdminDashboard } from '@/src/components/admin/AdminDashboard'

const preview: AdminDashboardSnapshot = {
  totals: {
    users: 12_842,
    creators: 386,
    publishedEpisodes: 1_248,
    totalViews: '2841000',
  },
  attention: {
    openReports: 12,
    processingAssets: 7,
    failedAssets: 2,
    creatorApplications: 18,
  },
  growth: [
    { date: '2026-08-21', users: 32 },
    { date: '2026-08-22', users: 46 },
    { date: '2026-08-23', users: 39 },
    { date: '2026-08-24', users: 58 },
    { date: '2026-08-25', users: 51 },
    { date: '2026-08-26', users: 72 },
    { date: '2026-08-27', users: 64 },
  ],
  previousWeekUsers: 297,
  periodDays: 7,
  episodeStatus: [
    { status: 'PUBLISHED', count: 1248 },
    { status: 'DRAFT', count: 184 },
    { status: 'SCHEDULED', count: 24 },
  ],
  recentUsers: [
    {
      id: 'preview-1',
      handle: 'minseo.film',
      displayName: '김민서',
      email: 'minseo@example.com',
      role: 'CREATOR',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 35 * 60_000),
    },
    {
      id: 'preview-2',
      handle: 'juno',
      displayName: '이준호',
      email: 'juno@example.com',
      role: 'VIEWER',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 4 * 3_600_000),
    },
    {
      id: 'preview-3',
      handle: 'yuna.archive',
      displayName: '박유나',
      email: 'yuna@example.com',
      role: 'PARTNER',
      status: 'ACTIVE',
      createdAt: new Date(Date.now() - 26 * 3_600_000),
    },
  ],
  topEpisodes: [
    {
      id: 'episode-1',
      title: '기억의 저편',
      seriesTitle: '밤의 기록',
      viewCount: '128400',
      likeCount: 4821,
    },
    {
      id: 'episode-2',
      title: '우리의 여름은 짧았다',
      seriesTitle: '계절의 사이',
      viewCount: '94120',
      likeCount: 3318,
    },
    {
      id: 'episode-3',
      title: '낯선 도시의 온도',
      seriesTitle: '시티 다이어리',
      viewCount: '78320',
      likeCount: 2940,
    },
  ],
}

export default function AdminPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()
  return <AdminDashboard data={preview} />
}
