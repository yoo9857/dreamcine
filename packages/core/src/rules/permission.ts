import type { UserRole, UserStatus } from '../enums.js'

export const ACTIONS = [
  'episode.create',
  'episode.update',
  'episode.publish',
  'episode.hide',
  'episode.remove',
  'series.create',
  'series.update',
  'series.remove',
  'upload.create',
  'comment.create',
  'comment.delete',
  'report.create',
  'report.review',
  'user.suspend',
  'user.setRole',
] as const

export type Action = (typeof ACTIONS)[number]

export interface Actor {
  id: string
  role: UserRole
  status: UserStatus
  emailVerified: boolean
}

export interface ResourceRef {
  ownerId?: string | undefined
}

function isAuthor(role: UserRole): boolean {
  return role === 'CREATOR' || role === 'ADMIN'
}

function isModerator(role: UserRole): boolean {
  return role === 'MODERATOR' || role === 'ADMIN'
}

/**
 * 권한 판정의 유일한 지점. (07_AUTH_SECURITY.md §2 권한 매트릭스)
 *
 * 라우트·서비스·컴포넌트가 `role === 'ADMIN'` 을 직접 비교하는 것은 금지된다.
 * 권한 로직이 흩어지면 반드시 구멍이 생긴다.
 *
 * 규칙 3개:
 * 1. `status !== 'ACTIVE'` 는 무조건 false. 정지·삭제 계정은 아무것도 못 한다.
 * 2. 이메일 미인증은 업로드·댓글이 막힌다. (§1 이메일 인증 필수)
 * 3. 소유가 필요한 동작에서 `resource.ownerId` 가 없으면 소유자로 보지 않는다.
 */
export function can(
  actor: Actor,
  action: Action,
  resource?: ResourceRef,
): boolean {
  if (actor.status !== 'ACTIVE') {
    return false
  }

  const { role } = actor
  const isOwner =
    resource?.ownerId !== undefined && resource.ownerId === actor.id

  switch (action) {
    // 시리즈·에피소드 생성: CREATOR 와 ADMIN
    case 'series.create':
    case 'episode.create':
      return isAuthor(role)

    // 업로드: 생성 권한 + 이메일 인증
    case 'upload.create':
      return isAuthor(role) && actor.emailVerified

    // 자기 콘텐츠 수정·공개: 소유자인 CREATOR/ADMIN 만.
    // 매트릭스에 "남의 콘텐츠 수정" 은 어떤 역할에도 없다.
    case 'series.update':
    case 'episode.update':
    case 'episode.publish':
      return isOwner && isAuthor(role)

    // 숨김: 모더레이터는 남의 것도, 크리에이터는 자기 것만
    case 'episode.hide':
      return isModerator(role) || (isOwner && isAuthor(role))

    // 영구삭제: 남의 것은 ADMIN 만, 자기 것은 CREATOR 도
    case 'series.remove':
    case 'episode.remove':
      return role === 'ADMIN' || (isOwner && isAuthor(role))

    // 댓글 작성: 모든 역할. 단 이메일 인증 필수
    case 'comment.create':
      return actor.emailVerified

    // 댓글 삭제: 작성자 또는 모더레이터 (05_API_CONTRACT.md §7)
    case 'comment.delete':
      return isOwner || isModerator(role)

    // 신고: 로그인한 모든 역할
    case 'report.create':
      return true

    case 'report.review':
      return isModerator(role)

    case 'user.suspend':
    case 'user.setRole':
      return role === 'ADMIN'
  }
}
