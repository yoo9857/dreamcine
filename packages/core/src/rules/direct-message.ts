import type { DmPolicy, UserRole, UserStatus } from '../enums.js'

import { isAuthorRole } from './roles.js'

/**
 * 1:1 메시지 허용 판정. (ISS-023, T18 §3)
 *
 * 순수 함수다. 서비스가 상대·팔로우·차단을 조회해 넘기고, 여기서는 그 사실만으로
 * 판정한다. 거부 사유는 오류 코드 그대로 돌려준다 — 화면이 같은 코드로 같은
 * 문구를 고르게 하기 위해서다.
 */
export type DirectMessageDenial =
  | 'E_USER_SELF_ACTION'
  | 'E_SOCIAL_BLOCKED'
  | 'E_DM_NOT_CREATOR'
  | 'E_DM_CLOSED'
  | 'E_DM_FOLLOWERS_ONLY'

export type DirectMessageGate =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly code: DirectMessageDenial }

/** 판정에 필요한 상대의 사실. 저장된 역할을 넘긴다. */
export interface DirectMessageParty {
  readonly id: string
  readonly role: UserRole
  readonly status: UserStatus
  readonly dmPolicy: DmPolicy
}

export interface StartConversationFacts {
  readonly senderId: string
  readonly recipient: DirectMessageParty
  readonly senderFollowsRecipient: boolean
  readonly blocked: boolean
}

export interface SendInConversationFacts {
  /** 보내는 사람이 대화를 연 쪽(독자)인가. */
  readonly senderIsInitiator: boolean
  /** 대화의 상대. */
  readonly other: DirectMessageParty
  readonly senderFollowsOther: boolean
  readonly blocked: boolean
}

const ALLOWED: DirectMessageGate = { allowed: true }

function deny(code: DirectMessageDenial): DirectMessageGate {
  return { allowed: false, code }
}

/**
 * 받는 범위. 정지·삭제된 상대도 "받지 않음" 으로 본다 — 계정 상태를 남에게
 * 따로 알리지 않는다.
 */
function policyGate(
  recipient: DirectMessageParty,
  senderFollows: boolean,
): DirectMessageGate {
  if (recipient.status !== 'ACTIVE') return deny('E_DM_CLOSED')
  if (recipient.dmPolicy === 'NOBODY') return deny('E_DM_CLOSED')
  if (recipient.dmPolicy === 'FOLLOWERS' && !senderFollows) {
    return deny('E_DM_FOLLOWERS_ONLY')
  }
  return ALLOWED
}

/**
 * 새 대화를 열 수 있는가.
 *
 * 대화는 독자가 작가에게 연다. 받는 쪽이 제작 역할이 아니면 열 수 없다 — 작가가
 * 독자에게 먼저 보내는 경로를 막아 스팸 통로가 되지 않게 한다.
 */
export function canStartConversation(
  facts: StartConversationFacts,
): DirectMessageGate {
  if (facts.senderId === facts.recipient.id) return deny('E_USER_SELF_ACTION')
  if (facts.blocked) return deny('E_SOCIAL_BLOCKED')
  if (!isAuthorRole(facts.recipient.role)) return deny('E_DM_NOT_CREATOR')
  return policyGate(facts.recipient, facts.senderFollowsRecipient)
}

/**
 * 이미 있는 대화에 보낼 수 있는가.
 *
 * 대화를 연 쪽은 매번 상대의 받는 범위를 다시 따른다 — 작가가 "받지 않음" 으로
 * 바꾸면 이어 보내기도 멈춘다. 받은 쪽(작가)의 답장은 범위와 무관하다. 둘 다
 * 차단은 막는다.
 */
export function canSendInConversation(
  facts: SendInConversationFacts,
): DirectMessageGate {
  if (facts.blocked) return deny('E_SOCIAL_BLOCKED')
  if (!facts.senderIsInitiator) {
    return facts.other.status === 'ACTIVE' ? ALLOWED : deny('E_DM_CLOSED')
  }
  return policyGate(facts.other, facts.senderFollowsOther)
}
