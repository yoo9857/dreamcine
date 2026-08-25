import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { NotificationList } from '@/src/components/NotificationList'
import { listNotifications } from '@/src/services/notification/list-notifications'

export default async function NotificationsPage(): Promise<ReactNode> {
  const session = await getServerSession()
  if (session === null) redirect('/login?next=%2Fnotifications')
  const page = await listNotifications(session, { limit: 20 })
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-6 py-6">
      <h1 className="text-2xl font-bold text-fg">알림</h1>
      <NotificationList initialItems={page.items} />
    </main>
  )
}
