import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { AdminShell } from '@/src/components/admin/AdminShell'

import '@/src/styles/admin-dashboard.css'

export default async function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const session = await requireCapability('report.review', '/admin')
  return (
    <AdminShell
      user={{
        displayName: session.user.displayName,
        email: session.user.email,
        role: session.user.role,
      }}
    >
      {children}
    </AdminShell>
  )
}
