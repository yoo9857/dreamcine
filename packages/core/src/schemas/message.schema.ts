import { z } from 'zod'

import { DmPolicy } from '../enums.js'
import { PaginationSchema } from './pagination.schema.js'
import { PublicUserSchema } from './user.schema.js'

/**
 * 1:1 메시지 계약. (05_API_CONTRACT.md §7-1, ISS-023)
 *
 * 본문 길이는 여기서 자르지 않는다. 정제(`sanitizeUserText`) 뒤 길이로
 * 서비스가 `E_DM_TOO_LONG` 을 낸다 — 여기서 막으면 같은 상황이 `E_VALIDATION`
 * 으로 나가 화면이 정확한 안내를 고를 수 없다. 상한은 요청 크기 방어용이다.
 */
const RawMessageBodySchema = z.string().trim().min(1).max(10_000)

export const DmPolicySchema = z.enum(DmPolicy)

export const StartConversationSchema = z.object({
  handle: z.string().trim().min(1).max(64),
  body: RawMessageBodySchema,
})

export const SendMessageSchema = z.object({ body: RawMessageBodySchema })

/**
 * `cursor` 는 과거 쪽 페이지, `after` 는 그 메시지 이후의 새 메시지다.
 * 열린 대화의 짧은 주기 갱신이 `after` 를 쓴다.
 */
export const MessageListQuerySchema = PaginationSchema.extend({
  after: z.string().min(1).optional(),
})

export const ConversationListQuerySchema = PaginationSchema

export const UpdateMessagingPreferenceSchema = z.object({
  dmPolicy: DmPolicySchema,
})

export const MessageResponseSchema = z.object({
  id: z.string().min(1),
  conversationId: z.string().min(1),
  senderId: z.string().min(1),
  body: z.string(),
  createdAt: z.string().datetime(),
  mine: z.boolean(),
})

export const ConversationSummarySchema = z.object({
  id: z.string().min(1),
  other: PublicUserSchema,
  startedByMe: z.boolean(),
  lastMessageAt: z.string().datetime(),
  lastMessagePreview: z.string(),
  lastMessageMine: z.boolean(),
  unread: z.number().int().min(0),
})

export const DirectMessageDenialSchema = z.enum([
  'E_USER_SELF_ACTION',
  'E_SOCIAL_BLOCKED',
  'E_DM_NOT_CREATOR',
  'E_DM_CLOSED',
  'E_DM_FOLLOWERS_ONLY',
])

/** 대화 머리. 입력창을 열지, 왜 닫혔는지 알리는지를 서버가 정한다. */
export const ConversationDetailSchema = ConversationSummarySchema.extend({
  /** 신고(`USER` 대상)에 쓰는 상대 id. 메시지의 `senderId` 와 같은 값이다. */
  otherId: z.string().min(1),
  canSend: z.boolean(),
  denial: DirectMessageDenialSchema.nullable(),
})

export const ConversationPageSchema = z.object({
  items: z.array(ConversationSummarySchema),
  nextCursor: z.string().nullable(),
})

export const MessagePageSchema = z.object({
  items: z.array(MessageResponseSchema),
  nextCursor: z.string().nullable(),
})

export const StartConversationResponseSchema = z.object({
  conversationId: z.string().min(1),
  message: MessageResponseSchema,
})

export const UnreadMessageCountSchema = z.object({
  count: z.number().int().min(0),
})

export type StartConversationInput = z.infer<typeof StartConversationSchema>
export type SendMessageInput = z.infer<typeof SendMessageSchema>
export type MessageListQuery = z.infer<typeof MessageListQuerySchema>
export type ConversationListQuery = z.infer<typeof ConversationListQuerySchema>
export type UpdateMessagingPreferenceInput = z.infer<
  typeof UpdateMessagingPreferenceSchema
>
export type MessageResponse = z.infer<typeof MessageResponseSchema>
export type ConversationSummary = z.infer<typeof ConversationSummarySchema>
export type ConversationDetail = z.infer<typeof ConversationDetailSchema>
export type ConversationPage = z.infer<typeof ConversationPageSchema>
export type MessagePage = z.infer<typeof MessagePageSchema>
export type StartConversationResponse = z.infer<
  typeof StartConversationResponseSchema
>
