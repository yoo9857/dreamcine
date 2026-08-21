import { AppError } from '@aidream/core'
import { describe, expect, it } from 'vitest'

import { ARGON2_PARAMS, hashPassword, verifyPassword } from './password'

const PASSWORD = 'correct horse battery staple'

describe('hashPassword', () => {
  it('argon2id v19 형식으로 해시한다', async () => {
    const hash = await hashPassword(PASSWORD)
    expect(hash.startsWith('$argon2id$v=19$')).toBe(true)
  })

  it('OWASP 권장 파라미터를 해시에 반영한다', async () => {
    const hash = await hashPassword(PASSWORD)
    expect(hash).toContain(`m=${String(ARGON2_PARAMS.memoryCost)}`)
    expect(hash).toContain(`t=${String(ARGON2_PARAMS.timeCost)}`)
    expect(hash).toContain(`p=${String(ARGON2_PARAMS.parallelism)}`)
  })

  it('같은 평문도 salt 때문에 매번 다른 해시가 된다', async () => {
    const [first, second] = await Promise.all([
      hashPassword(PASSWORD),
      hashPassword(PASSWORD),
    ])
    expect(first).not.toBe(second)
  })
})

describe('verifyPassword', () => {
  it('같은 평문을 검증한다', async () => {
    const hash = await hashPassword(PASSWORD)
    await expect(verifyPassword(hash, PASSWORD)).resolves.toBe(true)
  })

  it('다른 평문은 false 다', async () => {
    const hash = await hashPassword(PASSWORD)
    await expect(verifyPassword(hash, `${PASSWORD}!`)).resolves.toBe(false)
  })

  it('해시가 null 이면 더미 해시로 검증하고 false 를 돌린다', async () => {
    await expect(verifyPassword(null, PASSWORD)).resolves.toBe(false)
  })

  it('손상된 해시 형식은 E_INTERNAL 로 올린다', async () => {
    await expect(
      verifyPassword('$argon2id$broken', PASSWORD),
    ).rejects.toMatchObject({ code: 'E_INTERNAL' })
    await expect(verifyPassword('not-a-hash', PASSWORD)).rejects.toBeInstanceOf(
      AppError,
    )
  })

  it('존재하는 계정과 없는 계정의 검증 시간이 비슷하다', async () => {
    const hash = await hashPassword(PASSWORD)
    // 더미 해시를 미리 만들어 최초 생성 비용을 측정에서 제외한다.
    await verifyPassword(null, PASSWORD)

    const startExisting = performance.now()
    await verifyPassword(hash, 'wrong password value')
    const existingMs = performance.now() - startExisting

    const startMissing = performance.now()
    await verifyPassword(null, 'wrong password value')
    const missingMs = performance.now() - startMissing

    // 타이밍 측정은 환경 노이즈가 크므로 자릿수 차이만 본다.
    // 검증을 아예 건너뛰면 missing 이 0ms 에 가까워져 이 단정이 깨진다.
    expect(missingMs).toBeGreaterThan(existingMs / 5)
  })
})
