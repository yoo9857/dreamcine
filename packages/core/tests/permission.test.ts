import { describe, expect, it } from 'vitest'

import {
  ACTIONS,
  can,
  type Action,
  type Actor,
} from '../src/rules/permission.js'
import { UserRole, UserStatus } from '../src/enums.js'

const OWNER_ID = 'user_owner'
const OTHER_ID = 'user_other'

function actor(
  role: (typeof UserRole)[number],
  overrides: Partial<Actor> = {},
): Actor {
  return {
    id: OWNER_ID,
    role,
    status: 'ACTIVE',
    emailVerified: true,
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
const MATRIX: Record<
  Action,
  Record<(typeof UserRole)[number], readonly [boolean, boolean]>
> = {
  'episode.create': {
    VIEWER: [false, false],
    CREATOR: [true, true],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
  'series.create': {
    VIEWER: [false, false],
    CREATOR: [true, true],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
  'upload.create': {
    VIEWER: [false, false],
    CREATOR: [true, true],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
  'episode.update': {
    VIEWER: [false, false],
    CREATOR: [true, false],
    MODERATOR: [false, false],
    ADMIN: [true, false],
  },
  'series.update': {
    VIEWER: [false, false],
    CREATOR: [true, false],
    MODERATOR: [false, false],
    ADMIN: [true, false],
  },
  'episode.publish': {
    VIEWER: [false, false],
    CREATOR: [true, false],
    MODERATOR: [false, false],
    ADMIN: [true, false],
  },
  'episode.hide': {
    VIEWER: [false, false],
    CREATOR: [true, false],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },
  'episode.remove': {
    VIEWER: [false, false],
    CREATOR: [true, false],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
  'series.remove': {
    VIEWER: [false, false],
    CREATOR: [true, false],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
  'comment.create': {
    VIEWER: [true, true],
    CREATOR: [true, true],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },
  'comment.delete': {
    VIEWER: [true, false],
    CREATOR: [true, false],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },
  'report.create': {
    VIEWER: [true, true],
    CREATOR: [true, true],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },
  'report.review': {
    VIEWER: [false, false],
    CREATOR: [false, false],
    MODERATOR: [true, true],
    ADMIN: [true, true],
  },
  'user.suspend': {
    VIEWER: [false, false],
    CREATOR: [false, false],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
  'user.setRole': {
    VIEWER: [false, false],
    CREATOR: [false, false],
    MODERATOR: [false, false],
    ADMIN: [true, true],
  },
}

/** 이메일 인증이 필요한 동작. (07_AUTH_SECURITY.md §1) */
const EMAIL_VERIFIED_REQUIRED: readonly Action[] = [
  'upload.create',
  'comment.create',
]

/** 소유 판정이 결과를 바꾸는 동작. resource 가 없으면 소유자가 아니다. */
const OWNERSHIP_SENSITIVE: readonly Action[] = [
  'episode.update',
  'series.update',
  'episode.publish',
  'episode.remove',
  'series.remove',
  'comment.delete',
]

const COMBINATIONS = ACTIONS.flatMap((action) =>
  UserRole.flatMap((role) =>
    ([true, false] as const).map(
      (owned) =>
        [action, role, owned, MATRIX[action][role][owned ? 0 : 1]] as const,
    ),
  ),
)

describe('can()', () => {
  it('역할 × 동작 × 소유관계 전조합을 검사한다', () => {
    expect(COMBINATIONS).toHaveLength(ACTIONS.length * UserRole.length * 2)
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
        for (const role of UserRole) {
          expect(
            can(actor(role, { status }), action, { ownerId: OWNER_ID }),
          ).toBe(false)
        }
      }
    },
  )

  it.each(EMAIL_VERIFIED_REQUIRED)(
    '%s 는 이메일 미인증이면 false',
    (action) => {
      for (const role of UserRole) {
        expect(
          can(actor(role, { emailVerified: false }), action, {
            ownerId: OWNER_ID,
          }),
        ).toBe(false)
      }
    },
  )

  it('이메일 인증과 무관한 동작은 미인증에도 판정이 바뀌지 않는다', () => {
    for (const action of ACTIONS) {
      if (EMAIL_VERIFIED_REQUIRED.includes(action)) {
        continue
      }
      for (const role of UserRole) {
        const verified = can(actor(role), action, { ownerId: OWNER_ID })
        const unverified = can(actor(role, { emailVerified: false }), action, {
          ownerId: OWNER_ID,
        })
        expect(unverified).toBe(verified)
      }
    }
  })

  it.each(OWNERSHIP_SENSITIVE)('%s 는 resource 가 없으면 false', (action) => {
    expect(can(actor('CREATOR'), action)).toBe(false)
    expect(can(actor('CREATOR'), action, {})).toBe(false)
    expect(can(actor('CREATOR'), action, { ownerId: undefined })).toBe(false)
  })

  it('ADMIN 도 남의 콘텐츠를 수정할 수는 없다', () => {
    expect(can(actor('ADMIN'), 'episode.update', { ownerId: OTHER_ID })).toBe(
      false,
    )
    expect(can(actor('ADMIN'), 'episode.remove', { ownerId: OTHER_ID })).toBe(
      true,
    )
  })

  it('MODERATOR 는 숨김은 되지만 영구삭제는 안 된다', () => {
    expect(can(actor('MODERATOR'), 'episode.hide', { ownerId: OTHER_ID })).toBe(
      true,
    )
    expect(
      can(actor('MODERATOR'), 'episode.remove', { ownerId: OTHER_ID }),
    ).toBe(false)
  })
})
