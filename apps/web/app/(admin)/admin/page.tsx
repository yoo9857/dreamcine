import type { Metadata } from 'next'

import { requireCapability } from '@/src/auth/server-session'
import { AdminDashboard } from '@/src/components/admin/AdminDashboard'
import { getAdminDashboard } from '@/src/services/moderation/get-admin-dashboard'

export const metadata: Metadata = {
  title: '관리자 대시보드',
  robots: { index: false, follow: false },
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const session = await requireCapability('user.suspend', '/admin')
  const { range } = await searchParams
  const data = await getAdminDashboard(session, range === '30d' ? 30 : 7)
  return <AdminDashboard data={data} />
}
