import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  await requireCapability('report.review', '/admin/reports')
  return children
}
