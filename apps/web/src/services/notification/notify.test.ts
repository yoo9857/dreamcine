import { describe, expect, it, vi } from 'vitest'

import { notify, type NotifyDependencies } from './notify'

function dependencies(): NotifyDependencies {
  return {
    blocked: vi.fn().mockResolvedValue(false),
    reserve: vi.fn().mockResolvedValue(true),
    insert: vi.fn().mockResolvedValue({}),
  }
}

describe('notify', () => {
  it('does not notify the actor about their own action', async () => {
    const deps = dependencies()
    await notify({ type: 'NEW_FOLLOWER', to: 'same', actorId: 'same' }, deps)
    expect(deps.insert).not.toHaveBeenCalled()
  })

  it('suppresses blocked and duplicate notifications', async () => {
    const blocked = dependencies()
    vi.mocked(blocked.blocked).mockResolvedValue(true)
    await notify(
      { type: 'NEW_LIKE', to: 'owner', actorId: 'viewer', episodeId: 'ep' },
      blocked,
    )
    expect(blocked.insert).not.toHaveBeenCalled()

    const duplicate = dependencies()
    vi.mocked(duplicate.reserve).mockResolvedValue(false)
    await notify(
      { type: 'NEW_LIKE', to: 'owner', actorId: 'viewer', episodeId: 'ep' },
      duplicate,
    )
    expect(duplicate.insert).not.toHaveBeenCalled()
  })

  it('creates every comment notification without deduplication', async () => {
    const deps = dependencies()
    await notify(
      {
        type: 'NEW_COMMENT',
        to: 'owner',
        actorId: 'viewer',
        episodeId: 'ep',
        commentId: 'comment',
      },
      deps,
    )
    expect(deps.reserve).not.toHaveBeenCalled()
    expect(deps.insert).toHaveBeenCalledOnce()
  })
})
