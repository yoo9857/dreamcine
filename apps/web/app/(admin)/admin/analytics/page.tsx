import type { Metadata } from 'next'

import { requireCapability } from '@/src/auth/server-session'
import { AdminAnalyticsDashboard } from '@/src/components/admin/AdminAnalyticsDashboard'
import { getAdminAnalytics } from '@/src/services/moderation/get-admin-analytics'

export const metadata: Metadata = {
  title: '영상 분석',
  robots: { index: false, follow: false },
}

export default async function AdminAnalyticsPage() {
  const session = await requireCapability('user.suspend', '/admin/analytics')
  const data = await getAdminAnalytics(session)
  return <AdminAnalyticsDashboard data={data} />
}
