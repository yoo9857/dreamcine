import { describe, expect, it } from 'vitest'

import {
  ACTIONS,
  actorFromAccount,
  can,
  guestActor,
  type Action,
  type Actor,
} from '../src/rules/permission.js'
import { ROLE_LADDER, type ActorRole } from '../src/rules/roles.js'
import { UserStatus } from '../src/enums.js'

const OWNER_ID = 'user_owner'
const OTHER_ID = 'user_other'

/**
 * 실효 역할로 판정 주체를 만든다.
 *
 * `emailVerified` 를 역할에서 정하는 이유: `VIEWER` 는 **정의상 미인증**이다
 * (인증되면 `resolveActorRole` 이 `MEMBER` 로 올린다). `role: 'VIEWER'` 이면서
 * `emailVerified: true` 인 주체는 실제로 존재할 수 없는 상태이므로, 그 조합을
 * 표에 넣으면 표가 현실과 어긋난다.
 */
function actor(role: ActorRole, overrides: Partial<Actor> = {}): Actor {
  const verified = role !== 'GUEST' && role !== 'VIEWER'
  return {
    id: role === 'GUEST' ? null : OWNER_ID,
    role,
    status: 'ACTIVE',
    emailVerified: verified,
    ...overrides,
  }
}

/**
 * 07_AUTH_SECURITY.md §2 권한 매트릭스를 그대로 옮긴 표.
 * `[소유자일 때, 남의 것일 때]` 순서다. 생성 동작은 소유 개념이 없으므로 두 값이 같다.
 *
 * 표를 손으로 나열하고 코드로 계산하지 않는다 — 계산하면 구현 버그를 그대로
 * 따라가므로 검증이 되지 않는다. (O06_TESTING_QA.md §3)
 */
const MATRIX: Record<Action, Record<ActorRole, readonly [boolean, boolean]>> = {
  // ── 읽기: 게스트도 공개 콘텐츠를 본다
  'episode.watch': {
    GUEST: [true, true],
    VIEWER: [true, true],
    MEMBER: [true, true],
    CREATOR: [true, true],
    PARTNER: [true, true],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },

  // ── 참여: 이메일 인증 필수. VIEWER 는 정의상 미인증이라 막힌다
  'comment.create': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [true, true],
    CREATOR: [true, true],
    PARTNER: [true, true],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },
  'social.follow': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [true, true],
    CREATOR: [true, true],
    PARTNER: [true, true],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },
  'social.like': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [true, true],
    CREATOR: [true, true],
    PARTNER: [true, true],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },
  'playlist.create': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [true, true],
    CREATOR: [true, true],
    PARTNER: [true, true],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },

  // ── 신고: 미인증 계정도 된다. 피해 신고를 인증 뒤에 두지 않는다
  'report.create': {
    GUEST: [false, false],
    VIEWER: [true, true],
    MEMBER: [true, true],
    CREATOR: [true, true],
    PARTNER: [true, true],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },

  // ── 자기 프로필: 본인만
  'profile.update': {
    GUEST: [false, false],
    VIEWER: [true, false],
    MEMBER: [true, false],
    CREATOR: [true, false],
    PARTNER: [true, false],
    MODERATOR: [true, false],
    ADMIN: [true, false],
  },

  // ── 제작: MODERATOR 는 제작자가 아니다
  'episode.create': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [true, true],
    PARTNER: [true, true],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
  'series.create': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [true, true],
    PARTNER: [true, true],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
  'upload.create': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [true, true],
    PARTNER: [true, true],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },

  // ── 자기 콘텐츠 수정·공개: 소유자인 제작 역할만
  'episode.update': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [true, false],
    PARTNER: [true, false],
    MODERATOR: [false, false],
    ADMIN: [true, false],
  },
  'series.update': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [true, false],
    PARTNER: [true, false],
    MODERATOR: [false, false],
    ADMIN: [true, false],
  },
  'episode.publish': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [true, false],
    PARTNER: [true, false],
    MODERATOR: [false, false],
    ADMIN: [true, false],
  },

  // ── 숨김: 모더레이터는 남의 것도
  'episode.hide': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [true, false],
    PARTNER: [true, false],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },

  // ── 영구삭제: 남의 것은 ADMIN 만
  'episode.remove': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [true, false],
    PARTNER: [true, false],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
  'series.remove': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [true, false],
    PARTNER: [true, false],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },

  // ── 댓글 삭제: 작성자 또는 모더레이터. 미인증 VIEWER 도 자기 댓글은 지운다
  'comment.delete': {
    GUEST: [false, false],
    VIEWER: [true, false],
    MEMBER: [true, false],
    CREATOR: [true, false],
    PARTNER: [true, false],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },

  // ── 운영
  'report.review': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [false, false],
    PARTNER: [false, false],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },
  'user.viewAudit': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [false, false],
    PARTNER: [false, false],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },
  'user.suspend': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [false, false],
    PARTNER: [false, false],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
  'user.setRole': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [false, false],
    PARTNER: [false, false],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },

  // ── 정산: PARTNER 는 자기 것만, ADMIN 은 전부
  'monetization.view': {
    GUEST: [false, false],
    VIEWER: [false, false],
    MEMBER: [false, false],
    CREATOR: [false, false],
    PARTNER: [true, false],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
}

/** 이메일 인증이 필요한 동작. (07_AUTH_SECURITY.md §1) */
const EMAIL_VERIFIED_REQUIRED: readonly Action[] = [
  'upload.create',
  'comment.create',
  'social.follow',
  'social.like',
  'playlist.create',
]

const COMBINATIONS = ACTIONS.flatMap((action) =>
  ROLE_LADDER.flatMap((role) =>
    ([true, false] as const).map(
      (owned) =>
        [action, role, owned, MATRIX[action][role][owned ? 0 : 1]] as const,
    ),
  ),
)

describe('can()', () => {
  it('역할 × 동작 × 소유관계 전조합을 검사한다', () => {
    expect(COMBINATIONS).toHaveLength(ACTIONS.length * ROLE_LADDER.length * 2)
  })

  it.each(COMBINATIONS)(
    '%s / %s / owner=%s → %s',
    (action, role, owned, expected) => {
      const result = can(actor(role), action, {
        ownerId: owned ? OWNER_ID : OTHER_ID,
      })
      expect(result).toBe(expected)
    },
  )

  it.each(UserStatus.filter((status) => status !== 'ACTIVE'))(
    "status='%s' 는 모든 동작이 false",
    (status) => {
      for (const action of ACTIONS) {
        for (const role of ROLE_LADDER) {
          expect(
            can(actor(role, { status }), action, { ownerId: OWNER_ID }),
          ).toBe(false)
        }
      }
    },
  )

  it.each(EMAIL_VERIFIED_REQUIRED)(
    '%s 는 이메일 미인증이면 역할과 무관하게 false',
    (action) => {
      for (const role of ROLE_LADDER) {
        expect(
          can(actor(role, { emailVerified: false }), action, {
            ownerId: OWNER_ID,
          }),
        ).toBe(false)
      }
    },
  )

  it('소유 정보가 없으면 소유자로 보지 않는다', () => {
    const ownershipSensitive: readonly Action[] = [
      'episode.update',
      'series.update',
      'episode.publish',
      'episode.remove',
      'series.remove',
      'comment.delete',
      'profile.update',
      'monetization.view',
    ]
    for (const action of ownershipSensitive) {
      // CREATOR·PARTNER 는 소유일 때만 통과하는 역할이므로, resource 를 빼면
      // 전부 막혀야 한다.
      expect(can(actor('CREATOR'), action)).toBe(MATRIX[action].CREATOR[1])
      expect(can(actor('PARTNER'), action)).toBe(MATRIX[action].PARTNER[1])
    }
  })
})

describe('guestActor()', () => {
  it('id 가 없고 역할이 GUEST 다', () => {
    const guest = guestActor()
    expect(guest.id).toBeNull()
    expect(guest.role).toBe('GUEST')
  })

  it('소유자 id 를 위조해도 소유 판정이 통과하지 않는다', () => {
    // ownerId 가 null 과 같아지는 경로가 없어야 한다.
    expect(can(guestActor(), 'profile.update', { ownerId: OWNER_ID })).toBe(
      false,
    )
    expect(can(guestActor(), 'comment.delete', { ownerId: OWNER_ID })).toBe(
      false,
    )
  })
})

describe('actorFromAccount()', () => {
  it('세션이 없으면 GUEST 다', () => {
    expect(actorFromAccount(null).role).toBe('GUEST')
  })

  it('이메일 인증된 VIEWER 는 MEMBER 로 승급된다', () => {
    const result = actorFromAccount({
      id: OWNER_ID,
      role: 'VIEWER',
      status: 'ACTIVE',
      emailVerified: true,
    })
    expect(result.role).toBe('MEMBER')
  })

  it('미인증 VIEWER 는 VIEWER 로 남는다', () => {
    const result = actorFromAccount({
      id: OWNER_ID,
      role: 'VIEWER',
      status: 'ACTIVE',
      emailVerified: false,
    })
    expect(result.role).toBe('VIEWER')
  })

  it('CREATOR 는 이메일이 미인증이어도 강등되지 않는다', () => {
    // 강등하면 그 사람의 기존 작품 소유 판정까지 흔들린다.
    const result = actorFromAccount({
      id: OWNER_ID,
      role: 'CREATOR',
      status: 'ACTIVE',
      emailVerified: false,
    })
    expect(result.role).toBe('CREATOR')
    // 다만 업로드는 막힌다.
    expect(can(result, 'upload.create')).toBe(false)
  })
})
