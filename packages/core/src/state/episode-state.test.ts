import {
  AssetStatus,
  EpisodeStatus,
  UserRole,
  type TransitionActor,
  type TransitionContext,
} from '../index.js'
import { describe, expect, it } from 'vitest'

import { checkEpisodeTransition } from './episode-state.js'

const NOW = new Date('2026-08-25T00:00:00.000Z')
const FUTURE = new Date('2026-08-25T01:00:00.000Z')
const FIRST_PUBLISHED = new Date('2026-08-24T00:00:00.000Z')

const OWNER: TransitionActor = {
  kind: 'USER',
  role: 'CREATOR',
  isOwner: true,
}
const MODERATOR: TransitionActor = {
  kind: 'USER',
  role: 'MODERATOR',
  isOwner: false,
}
const OTHER: TransitionActor = {
  kind: 'USER',
  role: 'CREATOR',
  isOwner: false,
}

function context(patch: Partial<TransitionContext> = {}): TransitionContext {
  return {
    current: 'DRAFT',
    next: 'PUBLISHED',
    assetStatus: 'READY',
    aiDisclosure: '도구: AIDREAM',
    publishAt: null,
    publishedAt: null,
    now: NOW,
    actor: OWNER,
    ...patch,
  }
}

describe('checkEpisodeTransition', () => {
  it('사용자 실행의 5×5×3×2×3 조합을 모두 판정한다', () => {
    const assets = ['READY', 'TRANSCODING', null] as const
    const disclosures = ['표기', null] as const
    const actors = [OWNER, MODERATOR, OTHER] as const
    let examined = 0

    for (const current of EpisodeStatus) {
      for (const next of EpisodeStatus) {
        for (const assetStatus of assets) {
          for (const aiDisclosure of disclosures) {
            for (const actor of actors) {
              const verdict = checkEpisodeTransition(
                context({
                  current,
                  next,
                  assetStatus,
                  aiDisclosure,
                  actor,
                  publishAt: next === 'SCHEDULED' ? FUTURE : null,
                }),
              )
              expect(typeof verdict.ok).toBe('boolean')
              examined += 1
            }
          }
        }
      }
    }

    expect(examined).toBe(450)
  })

  it.each(EpisodeStatus)('REMOVED에서 %s 상태로 갈 수 없다', (next) => {
    expect(
      checkEpisodeTransition(context({ current: 'REMOVED', next })),
    ).toEqual({ ok: false, code: 'E_EPISODE_INVALID_TRANSITION' })
  })

  it.each<[TransitionContext['assetStatus']]>([
    ['PENDING'],
    ['PROBING'],
    ['TRANSCODING'],
    ['FAILED'],
    [null],
  ])('자산 상태 %s에서는 공개할 수 없다', (assetStatus) => {
    expect(checkEpisodeTransition(context({ assetStatus }))).toEqual({
      ok: false,
      code: 'E_EPISODE_ASSET_NOT_READY',
    })
  })

  it.each([null, '', '   '])('AI 표기 %s로 공개할 수 없다', (aiDisclosure) => {
    expect(checkEpisodeTransition(context({ aiDisclosure }))).toEqual({
      ok: false,
      code: 'E_EPISODE_AI_DISCLOSURE_REQUIRED',
    })
  })

  it('최초 공개 시각을 설정하고 재공개에서는 보존한다', () => {
    expect(checkEpisodeTransition(context())).toEqual({
      ok: true,
      patch: { publishAt: null, publishedAt: NOW },
    })
    expect(
      checkEpisodeTransition(
        context({
          current: 'HIDDEN',
          publishedAt: FIRST_PUBLISHED,
        }),
      ),
    ).toEqual({
      ok: true,
      patch: { publishAt: null, publishedAt: FIRST_PUBLISHED },
    })
  })

  it('모더레이터는 숨길 수 있지만 타인은 숨길 수 없다', () => {
    expect(
      checkEpisodeTransition(
        context({ current: 'PUBLISHED', next: 'HIDDEN', actor: MODERATOR }),
      ).ok,
    ).toBe(true)
    expect(
      checkEpisodeTransition(
        context({ current: 'PUBLISHED', next: 'HIDDEN', actor: OTHER }),
      ),
    ).toEqual({ ok: false, code: 'E_EPISODE_INVALID_TRANSITION' })
  })

  it('과거 예약을 거부한다', () => {
    expect(
      checkEpisodeTransition(context({ next: 'SCHEDULED', publishAt: NOW })),
    ).toEqual({ ok: false, code: 'E_EPISODE_SCHEDULE_IN_PAST' })
  })

  it('scheduler만 예약분을 공개하거나 DRAFT로 복귀시킨다', () => {
    const scheduler: TransitionActor = { kind: 'SCHEDULER' }
    expect(
      checkEpisodeTransition(
        context({ current: 'SCHEDULED', actor: scheduler }),
      ).ok,
    ).toBe(true)
    expect(
      checkEpisodeTransition(
        context({
          current: 'SCHEDULED',
          next: 'DRAFT',
          publishAt: FUTURE,
          actor: scheduler,
        }),
      ),
    ).toEqual({
      ok: true,
      patch: { publishAt: null, publishedAt: null },
    })
    expect(
      checkEpisodeTransition(
        context({ current: 'SCHEDULED', next: 'DRAFT', actor: OWNER }),
      ),
    ).toEqual({ ok: false, code: 'E_EPISODE_INVALID_TRANSITION' })
  })

  it('관리자는 소유자가 아니어도 REMOVED 전이를 할 수 있다', () => {
    const admin: TransitionActor = {
      kind: 'USER',
      role: 'ADMIN',
      isOwner: false,
    }
    expect(
      checkEpisodeTransition(context({ next: 'REMOVED', actor: admin })).ok,
    ).toBe(true)
  })

  it('열거형 전부를 사용해 테스트 표 드리프트를 막는다', () => {
    expect(AssetStatus).toHaveLength(5)
    expect(UserRole).toContain('ADMIN')
  })
})
