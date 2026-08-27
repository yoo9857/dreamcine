import type { UserRole, UserStatus } from '../enums.js'

import {
  isAuthorRole,
  isModeratorRole,
  type ActorRole,
  resolveActorRole,
} from './roles.js'

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
  // ── ISS-020 로 추가된 동작
  'episode.watch',
  'social.follow',
  'social.like',
  'playlist.create',
  'profile.update',
  'user.viewAudit',
  'monetization.view',
] as const

export type Action = (typeof ACTIONS)[number]

/**
 * 판정 주체.
 *
 * `role` 은 **저장된 역할이 아니라 실효 역할**이다. 반드시
 * `resolveActorRole()` 을 통과한 값을 넣는다. `guestActor()` 와
 * `actorFromAccount()` 가 그 통로다.
 */
export interface Actor {
  readonly id: string | null
  readonly role: ActorRole
  readonly status: UserStatus
  readonly emailVerified: boolean
}

export interface ResourceRef {
  readonly ownerId?: string | undefined
}

/** 비로그인 방문자. 라우트가 `session === null` 을 각자 해석하지 않게 한다. */
export function guestActor(): Actor {
  return {
    id: null,
    role: 'GUEST',
    // 게스트는 정지될 수 없다. ACTIVE 로 두어야 `can()` 의 상태 게이트가
    // 게스트를 "정지 계정" 으로 오해하지 않는다 — 게스트가 막히는 이유는
    // 상태가 아니라 역할이어야 한다.
    status: 'ACTIVE',
    emailVerified: false,
  }
}

export interface ActorAccount {
  readonly id: string
  /** **저장된** 역할. GUEST 는 저장될 수 없으므로 여기 올 수 없다. */
  readonly role: UserRole
  readonly status: UserStatus
  readonly emailVerified: boolean
}

/** 세션에서 판정 주체를 만든다. 실효 역할 유도가 여기서 한 번만 일어난다. */
export function actorFromAccount(account: ActorAccount | null): Actor {
  if (account === null) return guestActor()
  return {
    id: account.id,
    role: resolveActorRole({ account }),
    status: account.status,
    emailVerified: account.emailVerified,
  }
}

/**
 * 권한 판정의 유일한 지점. (07_AUTH_SECURITY.md §2 권한 매트릭스)
 *
 * 라우트·서비스·컴포넌트가 `role === 'ADMIN'` 을 직접 비교하는 것은 금지된다.
 * 권한 로직이 흩어지면 반드시 구멍이 생긴다.
 *
 * 규칙 5개:
 * 1. `status !== 'ACTIVE'` 는 무조건 false. 정지·삭제 계정은 아무것도 못 한다.
 * 2. `GUEST` 는 **읽기만** 한다. 쓰기 동작은 전부 false.
 * 3. 참여·업로드는 `emailVerified` 를 직접 본다. 실효 역할이 MEMBER 이상이라는
 *    사실에 기대면, 승급 후 이메일을 바꿔 미인증이 된 계정이 통과한다.
 * 4. 사다리 비교(`hasAtLeast`)로 판정하지 않는다. `MODERATOR` 는 `CREATOR`
 *    보다 위지만 업로드는 못 한다. 운영 권한과 제작 권한은 다른 축이다.
 * 5. 소유가 필요한 동작에서 `resource.ownerId` 가 없으면 소유자로 보지 않는다.
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
  const isGuest = role === 'GUEST'
  const isOwner =
    resource?.ownerId !== undefined &&
    actor.id !== null &&
    resource.ownerId === actor.id
  /*
    참여 자격은 `emailVerified` 를 직접 본다. 실효 역할이 MEMBER 이상이라는
    사실만으로 판단하면, 인증 후 CREATOR 로 승급한 계정이 이메일을 바꿔
    미인증으로 돌아갔을 때 통과한다 — 역할은 승급된 채로 남기 때문이다.
    (07_AUTH_SECURITY.md §1 이메일 인증 필수)
  */
  const canParticipate = !isGuest && actor.emailVerified

  switch (action) {
    // ── 읽기: 게스트도 된다. 연령 등급·지역 제한은 별도 게이트가 판정한다.
    case 'episode.watch':
      return true

    // ── 참여: 이메일 인증 완료(MEMBER) 이상
    case 'comment.create':
    case 'social.follow':
    case 'social.like':
    case 'playlist.create':
      return canParticipate

    // ── 신고: 가입만 했으면 된다. 미인증 계정도 신고는 할 수 있어야 한다 —
    //    피해 신고를 인증 절차 뒤에 두면 그 시간만큼 피해가 계속된다.
    case 'report.create':
      return !isGuest

    // ── 자기 프로필 수정: 로그인한 본인
    case 'profile.update':
      return !isGuest && isOwner

    // ── 시리즈·에피소드 생성: 제작 역할
    case 'series.create':
    case 'episode.create':
      return isAuthorRole(role)

    // ── 업로드: 제작 역할 + 이메일 인증 이중 확인
    case 'upload.create':
      return isAuthorRole(role) && actor.emailVerified

    // ── 자기 콘텐츠 수정·공개: 소유자인 제작 역할만.
    //    매트릭스에 "남의 콘텐츠 수정" 은 어떤 역할에도 없다.
    case 'series.update':
    case 'episode.update':
    case 'episode.publish':
      return isOwner && isAuthorRole(role)

    // ── 숨김: 모더레이터는 남의 것도, 제작자는 자기 것만
    case 'episode.hide':
      return isModeratorRole(role) || (isOwner && isAuthorRole(role))

    // ── 영구삭제: 남의 것은 ADMIN 만, 자기 것은 제작자도
    case 'series.remove':
    case 'episode.remove':
      return role === 'ADMIN' || (isOwner && isAuthorRole(role))

    // ── 댓글 삭제: 작성자 또는 모더레이터 (05_API_CONTRACT.md §7)
    case 'comment.delete':
      return (!isGuest && isOwner) || isModeratorRole(role)

    case 'report.review':
      return isModeratorRole(role)

    // ── 정산 화면: 본인이 PARTNER 이거나 ADMIN
    case 'monetization.view':
      return role === 'PARTNER' ? isOwner : role === 'ADMIN'

    // ── 감사 로그 열람: 운영 이상
    case 'user.viewAudit':
      return isModeratorRole(role)

    case 'user.suspend':
    case 'user.setRole':
      return role === 'ADMIN'
  }
}
