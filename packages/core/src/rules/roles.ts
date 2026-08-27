import type { UserRole, UserStatus } from '../enums.js'

/**
 * 판정 계층의 역할. 저장되는 `UserRole` 에 `GUEST` 를 더한 것이다.
 *
 * `GUEST` 를 DB 열거형에 넣지 않는 이유: 게스트는 행이 없다. 저장 가능한 값으로
 * 만들면 "GUEST 로 저장된 계정" 이라는 불가능한 상태가 타입상 표현 가능해지고,
 * 그런 행이 하나 생기는 순간 그 계정은 아무 동작도 못 하면서 로그인은 되는
 * 유령이 된다. (ISS-020)
 */
export type ActorRole = UserRole | 'GUEST'

/**
 * 역할 사다리. 숫자는 **비교 전용**이며 저장되지 않는다.
 *
 * 값을 저장하지 않는 이유: 사다리 중간에 역할을 끼워 넣으면 모든 숫자가
 * 밀린다. 저장된 숫자와 코드의 숫자가 갈라지면 권한이 조용히 뒤바뀐다.
 */
export const ROLE_RANK: Readonly<Record<ActorRole, number>> = {
  GUEST: 0,
  VIEWER: 1,
  MEMBER: 2,
  CREATOR: 3,
  PARTNER: 4,
  MODERATOR: 5,
  ADMIN: 6,
}

/** 사다리 순서 그대로. 관리자 UI 의 역할 선택기와 문서 표가 이 순서를 쓴다. */
export const ROLE_LADDER: readonly ActorRole[] = [
  'GUEST',
  'VIEWER',
  'MEMBER',
  'CREATOR',
  'PARTNER',
  'MODERATOR',
  'ADMIN',
]

export const ROLE_LABELS: Readonly<Record<ActorRole, string>> = {
  GUEST: '게스트',
  VIEWER: '시청자',
  MEMBER: '정회원',
  CREATOR: '크리에이터',
  PARTNER: '파트너',
  MODERATOR: '운영자',
  ADMIN: '관리자',
}

/**
 * 사다리 비교.
 *
 * **주의**: 사다리는 권한의 근사치일 뿐이다. `MODERATOR` 는 `CREATOR` 보다
 * 위에 있지만 업로드는 못 한다 — 운영 권한과 제작 권한은 다른 축이다.
 * 그래서 `can()` 이 `hasAtLeast` 만으로 판정하지 않는다. 이 함수는 "이 역할
 * 이상에게만 보이는 화면" 같은 **표시 게이트**에 쓴다.
 */
export function hasAtLeast(role: ActorRole, minimum: ActorRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum]
}

/** 콘텐츠를 만들 수 있는 역할. MODERATOR 는 여기 없다 — 심사자는 제작자가 아니다. */
export function isAuthorRole(role: ActorRole): boolean {
  return role === 'CREATOR' || role === 'PARTNER' || role === 'ADMIN'
}

/** 남의 콘텐츠를 심사·숨김할 수 있는 역할. */
export function isModeratorRole(role: ActorRole): boolean {
  return role === 'MODERATOR' || role === 'ADMIN'
}

/** 우대 한도·정산 대상. */
export function isPartnerRole(role: ActorRole): boolean {
  return role === 'PARTNER' || role === 'ADMIN'
}

/** 로그인한 상태인가. `GUEST` 만 false 다. */
export function isAuthenticatedRole(role: ActorRole): boolean {
  return role !== 'GUEST'
}

export interface ActorRoleInput {
  /** 세션이 없으면 `null`. 이때 역할은 `GUEST` 다. */
  readonly account: {
    readonly role: UserRole
    readonly status: UserStatus
    readonly emailVerified: boolean
  } | null
}

/**
 * 판정에 쓸 실효 역할을 정한다. **권한 판정은 저장된 role 을 직접 읽지 않는다.**
 *
 * 두 가지를 유도한다.
 * 1. 세션이 없으면 `GUEST`.
 * 2. 저장된 역할이 `VIEWER` 이고 이메일이 인증됐으면 `MEMBER`.
 *
 * 2번을 저장하지 않고 유도하는 이유: `emailVerified` 가 이미 진실의 단일
 * 출처다. 역할 컬럼에 또 적으면 인증 철회·이메일 변경 시 두 값이 갈라질 수
 * 있고, 갈라진 쪽이 판정에 쓰이면 인증 게이트가 무력화된다. 유도하면 갈라질
 * 자리가 없다.
 *
 * 반대 방향(강등)은 유도하지 않는다: `CREATOR` 가 이메일을 미인증으로 되돌려도
 * 역할은 `CREATOR` 로 남고, 업로드는 `can()` 이 `emailVerified` 로 따로 막는다.
 * 역할을 흔들면 그 사람의 기존 작품 소유 판정까지 흔들린다.
 */
export function resolveActorRole(input: ActorRoleInput): ActorRole {
  const { account } = input
  if (account === null) return 'GUEST'
  if (account.role === 'VIEWER' && account.emailVerified) return 'MEMBER'
  return account.role
}

/**
 * ADMIN 이 대상에게 부여할 수 있는 역할 목록.
 *
 * 규칙 2개:
 * 1. ADMIN 만 역할을 부여한다.
 * 2. `GUEST` 는 부여 대상이 아니다 — 저장할 수 없는 값이다.
 *
 * `MEMBER` 도 부여 목록에서 빠진다: 유도되는 값이라 직접 지정하면 저장된
 * 역할과 실효 역할이 갈라진다. 강등은 `VIEWER` 로 한다.
 */
export const GRANTABLE_ROLES: readonly UserRole[] = [
  'VIEWER',
  'CREATOR',
  'PARTNER',
  'MODERATOR',
  'ADMIN',
]

export function isGrantableRole(role: string): role is UserRole {
  return (GRANTABLE_ROLES as readonly string[]).includes(role)
}
