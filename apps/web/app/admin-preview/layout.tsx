import type { ReactNode } from 'react'

import { AdminShell } from '@/src/components/admin/AdminShell'

import '@/src/styles/admin-dashboard.css'
import 'maplibre-gl/dist/maplibre-gl.css'

export default function AdminPreviewLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <AdminShell
      previewMode
      user={{
        displayName: '개발 관리자',
        email: 'admin@preview.local',
        role: 'ADMIN',
      }}
    >
      {children}
    </AdminShell>
  )
}
