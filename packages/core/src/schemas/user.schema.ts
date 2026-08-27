import { z } from 'zod'

import { MemberTier } from '../enums.js'

/**
 * 공개 사용자 요약. 피드·검색·댓글·크레딧이 **같은 모양**을 쓴다.
 *
 * 예전에는 `feed.schema.ts` 의 `CreatorSchema` 와 `comment.schema.ts` 의
 * `CommentUserSchema` 가 같은 필드를 따로 선언했다. 그래서 등급 하나를 노출하려면
 * 두 곳을 고쳐야 했고, 한쪽만 고치면 댓글에는 배지가 뜨는데 피드에는 안 뜨는
 * 상태가 됐다. 여기 하나만 둔다.
 *
 * `badge` 를 담지 않는 이유: `TIER_ALLOWANCE[tier].badge` 로 유도되는 값이다.
 * 응답에 같이 실으면 두 값이 갈라질 수 있고, 갈라진 쪽이 화면에 뜬다.
 */
export const PublicUserSchema = z.object({
  handle: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
  tier: z.enum(MemberTier),
  /** 인증 채널 배지. 등급 배지와 별개다 — 하나는 실적, 하나는 신원이다. */
  isVerified: z.boolean(),
})

export type PublicUser = z.infer<typeof PublicUserSchema>
