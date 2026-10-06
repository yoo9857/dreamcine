import { AppError } from '@aidream/core'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import { ConversationList } from '@/src/components/messages/ConversationList'
import {
  MessagesEmptyPane,
  MessagesShell,
} from '@/src/components/messages/MessagesShell'
import { NewConversation } from '@/src/components/messages/NewConversation'
import { listMyConversations } from '@/src/services/message/conversation-queries'
import {
  prepareConversation,
  type PreparedConversation,
} from '@/src/services/message/prepare-conversation'
import '@/src/styles/messages.css'

export const metadata: Metadata = {
  title: '메시지',
  robots: { index: false, follow: false },
}

export default async function MessagesPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ to?: string }>
}): Promise<ReactNode> {
  const [{ to }, session] = await Promise.all([
    searchParams,
    getServerSession(),
  ])
  const handle = typeof to === 'string' && to.trim() !== '' ? to.trim() : null
  if (session === null) {
    const next =
      handle === null
        ? '/messages'
        : `/messages?to=${encodeURIComponent(handle)}`
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }

  let prepared: PreparedConversation | null = null
  if (handle !== null) {
    try {
      prepared = await prepareConversation(session, handle)
    } catch (error: unknown) {
      if (error instanceof AppError && error.code === 'E_USER_NOT_FOUND') {
        notFound()
      }
      throw error
    }
  }
  if (prepared?.kind === 'EXISTING') {
    redirect(`/messages/${prepared.conversationId}`)
  }

  const page = await listMyConversations(session, { limit: 30 })

  return (
    <div className="messages-page" id="discovery-top">
      <DiscoveryTopbar user={session.user} />
      <MessagesShell
        paneOpen={prepared !== null}
        list={
          <ConversationList
            initialItems={page.items}
            initialCursor={page.nextCursor}
          />
        }
        pane={
          prepared === null ? (
            <MessagesEmptyPane />
          ) : (
            <NewConversation
              recipient={prepared.recipient}
              denial={prepared.denial}
            />
          )
        }
      />
    </div>
  )
}
