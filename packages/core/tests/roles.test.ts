import { describe, expect, it } from 'vitest'

import { UserRole } from '../src/enums.js'
import {
  GRANTABLE_ROLES,
  ROLE_LABELS,
  ROLE_LADDER,
  ROLE_RANK,
  hasAtLeast,
  isAuthenticatedRole,
  isAuthorRole,
  isGrantableRole,
  isModeratorRole,
  isPartnerRole,
  resolveActorRole,
  type ActorRole,
} from '../src/rules/roles.js'

describe('역할 사다리', () => {
  it('저장 가능한 역할에 GUEST 가 없다', () => {
    // GUEST 가 저장되면 "로그인은 되는데 아무것도 못 하는 유령" 이 생긴다.
    expect(UserRole as readonly string[]).not.toContain('GUEST')
  })

  it('사다리는 GUEST + 저장 역할 전부를 정확히 한 번씩 담는다', () => {
    expect([...ROLE_LADDER]).toEqual(['GUEST', ...UserRole])
    expect(new Set(ROLE_LADDER).size).toBe(ROLE_LADDER.length)
  })

  it('순위는 사다리 순서와 같고 중복이 없다', () => {
    const ranks = ROLE_LADDER.map((role) => ROLE_RANK[role])
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
    expect(new Set(ranks).size).toBe(ranks.length)
  })

  it('모든 역할에 한국어 라벨이 있다', () => {
    for (const role of ROLE_LADDER) {
      expect(ROLE_LABELS[role]).toBeTruthy()
    }
  })

  it('hasAtLeast 는 자기 자신을 포함한다', () => {
    for (const role of ROLE_LADDER) {
      expect(hasAtLeast(role, role)).toBe(true)
    }
  })

  it('hasAtLeast 는 사다리 순서를 따른다', () => {
    expect(hasAtLeast('ADMIN', 'GUEST')).toBe(true)
    expect(hasAtLeast('GUEST', 'VIEWER')).toBe(false)
    expect(hasAtLeast('PARTNER', 'CREATOR')).toBe(true)
    expect(hasAtLeast('CREATOR', 'PARTNER')).toBe(false)
  })
})

describe('역할 분류 헬퍼', () => {
  const AUTHORS: readonly ActorRole[] = ['CREATOR', 'PARTNER', 'ADMIN']
  const MODERATORS: readonly ActorRole[] = ['MODERATOR', 'ADMIN']
  const PARTNERS: readonly ActorRole[] = ['PARTNER', 'ADMIN']

  it.each(ROLE_LADDER)('isAuthorRole(%s)', (role) => {
    expect(isAuthorRole(role)).toBe(AUTHORS.includes(role))
  })

  it('MODERATOR 는 제작 역할이 아니다', () => {
    // 사다리에서 CREATOR 보다 위이지만 업로드는 못 한다. 운영 권한과 제작
    // 권한은 다른 축이라는 것이 이 한 줄로 고정된다.
    expect(hasAtLeast('MODERATOR', 'CREATOR')).toBe(true)
    expect(isAuthorRole('MODERATOR')).toBe(false)
  })

  it.each(ROLE_LADDER)('isModeratorRole(%s)', (role) => {
    expect(isModeratorRole(role)).toBe(MODERATORS.includes(role))
  })

  it.each(ROLE_LADDER)('isPartnerRole(%s)', (role) => {
    expect(isPartnerRole(role)).toBe(PARTNERS.includes(role))
  })

  it.each(ROLE_LADDER)('isAuthenticatedRole(%s)', (role) => {
    expect(isAuthenticatedRole(role)).toBe(role !== 'GUEST')
  })
})

describe('resolveActorRole()', () => {
  it('세션이 없으면 GUEST', () => {
    expect(resolveActorRole({ account: null })).toBe('GUEST')
  })

  it('이메일 인증된 VIEWER 만 MEMBER 로 올라간다', () => {
    expect(
      resolveActorRole({
        account: { role: 'VIEWER', status: 'ACTIVE', emailVerified: true },
      }),
    ).toBe('MEMBER')
    expect(
      resolveActorRole({
        account: { role: 'VIEWER', status: 'ACTIVE', emailVerified: false },
      }),
    ).toBe('VIEWER')
  })

  it('VIEWER 외의 역할은 인증 여부와 무관하게 그대로다', () => {
    for (const role of UserRole) {
      if (role === 'VIEWER') continue
      for (const emailVerified of [true, false]) {
        expect(
          resolveActorRole({
            account: { role, status: 'ACTIVE', emailVerified },
          }),
        ).toBe(role)
      }
    }
  })
})

describe('GRANTABLE_ROLES', () => {
  it('MEMBER 는 직접 부여할 수 없다', () => {
    // 유도되는 값이라 직접 지정하면 저장된 역할과 실효 역할이 갈라진다.
    expect(GRANTABLE_ROLES).not.toContain('MEMBER')
    expect(isGrantableRole('MEMBER')).toBe(false)
  })

  it('GUEST 는 부여 대상이 아니다', () => {
    expect(isGrantableRole('GUEST')).toBe(false)
  })

  it('MEMBER 를 제외한 모든 저장 역할을 부여할 수 있다', () => {
    expect([...GRANTABLE_ROLES]).toEqual(
      UserRole.filter((role) => role !== 'MEMBER'),
    )
  })

  it('알 수 없는 문자열은 거부한다', () => {
    expect(isGrantableRole('SUPERUSER')).toBe(false)
    expect(isGrantableRole('')).toBe(false)
  })
})
