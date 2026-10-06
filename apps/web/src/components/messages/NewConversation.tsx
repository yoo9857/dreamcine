'use client'

import {
  StartConversationResponseSchema,
  type ErrorCode,
  type PublicUser,
} from '@aidream/core'
import { Avatar } from '@aidream/ui'
import { ArrowLeft, BadgeCheck } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useState, type ReactNode } from 'react'

import { readApiError, staticMessageFor } from '@/src/lib/error-messages'

import { MessageComposer } from './MessageComposer'

/** 작가에게 첫 메시지를 보내는 화면. 보내면 그 대화로 넘어간다. */
export function NewConversation({
  recipient,
  denial,
}: {
  readonly recipient: PublicUser
  /** 서버가 미리 판정한 거절 사유. 있으면 입력창 대신 안내를 보인다. */
  readonly denial: ErrorCode | null
}): ReactNode {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const send = async (body: string): Promise<boolean> => {
    setError(null)
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ handle: recipient.handle, body }),
      })
      const payload: unknown = await response.json().catch(() => null)
      if (!response.ok) {
        setError(
          readApiError(payload)?.message ??
            '메시지를 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
        )
        return false
      }
      const started = StartConversationResponseSchema.parse(payload)
      router.replace(`/messages/${started.conversationId}`)
      router.refresh()
      return true
    } catch {
      setError('네트워크 연결을 확인한 뒤 다시 시도해 주세요.')
      return false
    }
  }

  return (
    <section className="dm-thread" aria-label="새 메시지">
      <header className="dm-thread-head">
        <Link href="/messages" className="dm-back" aria-label="메시지함으로">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <Link href={`/u/${recipient.handle}`} className="dm-thread-who">
          <Avatar
            name={recipient.displayName}
            src={recipient.avatarUrl}
            size="md"
            className="dm-thread-avatar"
          />
          <span>
            <strong>
              {recipient.displayName}
              {recipient.isVerified ? (
                <BadgeCheck role="img" aria-label="인증 채널" />
              ) : null}
            </strong>
            <small>@{recipient.handle}</small>
          </span>
        </Link>
      </header>

      <div className="dm-thread-scroll">
        <div className="dm-new-intro">
          <Avatar
            name={recipient.displayName}
            src={recipient.avatarUrl}
            size="lg"
            className="dm-new-avatar"
          />
          <strong>{recipient.displayName}</strong>
          <p>
            작품에 대한 감상이나 궁금한 점을 보내 보세요. 작가가 답하면 이
            대화에서 이어집니다.
          </p>
        </div>
      </div>

      <footer className="dm-thread-foot">
        {error === null ? null : (
          <p role="alert" className="dm-error">
            {error}
          </p>
        )}
        {denial === null ? (
          <MessageComposer
            placeholder={`${recipient.displayName}님에게 첫 메시지 보내기`}
            autoFocus
            onSend={send}
          />
        ) : (
          <p className="dm-closed" role="status">
            {staticMessageFor(denial)}
          </p>
        )}
      </footer>
    </section>
  )
}
