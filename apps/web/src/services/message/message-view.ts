import {
  LIMITS,
  type ConversationSummary,
  type MessageResponse,
  type PublicUser,
} from '@aidream/core'
import type {
  ConversationRow,
  DirectMessageRow,
  MessagingPartyRow,
} from '@aidream/db'
import { avatarUrl } from '@aidream/storage/cdn'

/** 저장소 행 → 화면 계약. 메시지 서비스들이 같은 모양을 내도록 한 곳에 둔다. */

export function toPublicUser(party: MessagingPartyRow): PublicUser {
  return {
    handle: party.handle,
    displayName: party.displayName,
    avatarUrl: avatarUrl(party.avatarKey),
    tier: party.tier,
    isVerified: party.verifiedAt !== null,
  }
}

export function isParticipant(row: ConversationRow, userId: string): boolean {
  return row.initiatorId === userId || row.recipientId === userId
}

export function otherParty(
  row: ConversationRow,
  userId: string,
): MessagingPartyRow {
  return row.initiatorId === userId ? row.recipient : row.initiator
}

export function toConversationSummary(
  row: ConversationRow,
  userId: string,
): ConversationSummary {
  const startedByMe = row.initiatorId === userId
  return {
    id: row.id,
    other: toPublicUser(otherParty(row, userId)),
    startedByMe,
    lastMessageAt: row.lastMessageAt.toISOString(),
    lastMessagePreview: row.lastMessagePreview,
    lastMessageMine: row.lastSenderId === userId,
    unread: startedByMe ? row.initiatorUnread : row.recipientUnread,
  }
}

export function toMessageResponse(
  row: DirectMessageRow,
  userId: string,
): MessageResponse {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    mine: row.senderId === userId,
  }
}

/** 목록에 보일 한 줄. 줄바꿈을 접고 `DM_PREVIEW_LEN` 에서 자른다. */
export function messagePreview(body: string): string {
  const line = body.replace(/\s+/gu, ' ').trim()
  const chars = Array.from(line)
  return chars.length <= LIMITS.DM_PREVIEW_LEN
    ? line
    : `${chars.slice(0, LIMITS.DM_PREVIEW_LEN - 1).join('')}…`
}
