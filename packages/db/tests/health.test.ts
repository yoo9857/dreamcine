import { AppError } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import { withDeadline } from '../src/health.js'

/** 절대 끝나지 않는 작업. 타임아웃 분기를 결정적으로 만든다. */
function never<T>(): Promise<T> {
  return new Promise<T>(() => {
    // 의도적으로 resolve/reject 하지 않는다.
  })
}

describe('withDeadline', () => {
  it('시간 안에 끝나면 결과를 그대로 돌려준다', async () => {
    await expect(
      withDeadline(Promise.resolve('ok'), 1000, () => new Error('unused')),
    ).resolves.toBe('ok')
  })

  it('작업이 거절하면 그 오류가 그대로 나온다', async () => {
    const failure = new AppError('E_DB_CONFLICT')

    await expect(
      withDeadline(Promise.reject(failure), 1000, () => new Error('unused')),
    ).rejects.toBe(failure)
  })

  it('시간을 넘기면 onTimeout 이 만든 오류로 거절한다', async () => {
    const timeout = new AppError('E_DB_UNAVAILABLE', { reason: 'timeout' })

    await expect(withDeadline(never(), 5, () => timeout)).rejects.toBe(timeout)
  })

  it('타임아웃 오류를 만드는 시점은 만료 직후다', async () => {
    let created = 0

    await expect(
      withDeadline(never(), 5, () => {
        created += 1
        return new AppError('E_DB_UNAVAILABLE')
      }),
    ).rejects.toBeInstanceOf(AppError)
    expect(created).toBe(1)
  })

  it('작업이 먼저 끝나면 onTimeout 을 부르지 않는다', async () => {
    let created = 0

    await withDeadline(Promise.resolve(1), 50, () => {
      created += 1
      return new Error('unused')
    })
    // 타이머가 남아 있으면 여기서 1 이 된다. clearTimeout 이 도는지 확인한다.
    await new Promise((resolve) => setTimeout(resolve, 80))
    expect(created).toBe(0)
  })
})
