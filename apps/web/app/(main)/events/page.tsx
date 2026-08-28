import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { DiscoveryFooter } from '@/src/components/discovery/DiscoveryFooter'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import { EventsBoard } from '@/src/components/events/EventsBoard'
import '@/src/styles/events.css'

export const metadata: Metadata = {
  title: '이벤트 · ilog',
  description: '공모전, 이벤트, 워크숍 등 ilog의 새로운 소식을 만나보세요.',
}

export default async function EventsPage(): Promise<ReactNode> {
  const session = await getServerSession()
  return (
    <div className="events-page" id="discovery-top">
      <DiscoveryTopbar user={session ? session.user : null} />
      <EventsBoard />
      <DiscoveryFooter handle={session ? session.user.handle : 'ilog'} />
    </div>
  )
}
