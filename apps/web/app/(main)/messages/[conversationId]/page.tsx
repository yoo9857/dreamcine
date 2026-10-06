import { AppError } from '@aidream/core'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { getServerSession } from '@/src/auth/server-session'
import { DiscoveryTopbar } from '@/src/components/discovery/DiscoveryTopbar'
import { ConversationList } from '@/src/components/messages/ConversationList'
import { MessageThread } from '@/src/components/messages/MessageThread'
import { MessagesShell } from '@/src/components/messages/MessagesShell'
import {
  getConversationDetail,
  listConversationMessages,
  listMyConversations,
} from '@/src/services/message/conversation-queries'
import '@/src/styles/messages.css'

export const metadata: Metadata = {
  title: '메시지',
  robots: { index: false, follow: false },
}

export default async function ConversationPage({
  params,
}: {
  readonly params: Promise<{ conversationId: string }>
}): Promise<ReactNode> {
  const [{ conversationId }, session] = await Promise.all([
    params,
    getServerSession(),
  ])
  if (session === null) {
    redirect(`/login?next=${encodeURIComponent(`/messages/${conversationId}`)}`)
  }

  try {
    const [detail, history, page] = await Promise.all([
      getConversationDetail(session, conversationId),
      listConversationMessages(session, conversationId, { limit: 30 }),
      listMyConversations(session, { limit: 30 }),
    ])
    return (
      <div className="messages-page" id="discovery-top">
        <DiscoveryTopbar user={session.user} />
        <MessagesShell
          paneOpen
          list={
            <ConversationList
              initialItems={page.items}
              initialCursor={page.nextCursor}
              activeId={detail.id}
            />
          }
          pane={
            // 대화가 바뀌면 입력 중이던 글과 스크롤을 새로 시작한다.
            <MessageThread
              key={detail.id}
              detail={detail}
              initialMessages={history.items}
              initialCursor={history.nextCursor}
            />
          }
        />
      </div>
    )
  } catch (error: unknown) {
    if (
      error instanceof AppError &&
      error.code === 'E_DM_CONVERSATION_NOT_FOUND'
    ) {
      notFound()
    }
    throw error
  }
}
