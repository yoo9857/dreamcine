import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkLimits } from './check-limits.js'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

async function createFixture(spec: string, code: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'aidream-limits-'))
  temporaryRoots.push(root)
  const specDirectory = join(root, 'docs', '00_SPEC')
  const codeDirectory = join(root, 'packages', 'core', 'src')
  await Promise.all([
    mkdir(specDirectory, { recursive: true }),
    mkdir(codeDirectory, { recursive: true }),
  ])
  await Promise.all([
    writeFile(join(specDirectory, '10_NFR.md'), spec),
    writeFile(join(codeDirectory, 'limits.ts'), code),
  ])
  return root
}

describe('checkLimits', () => {
  it('동일한 키와 숫자식을 승인한다', async () => {
    const root = await createFixture(
      'LIMIT_A: 32 * 1024 ** 2,\nLIMIT_B: 10_000,',
      'LIMIT_A: 32 * 1024 ** 2,\nLIMIT_B: 10_000,',
    )

    await expect(checkLimits(root)).resolves.toEqual({ ok: true, problems: [] })
  })

  it('값 불일치를 검출한다', async () => {
    const root = await createFixture('LIMIT_A: 10,', 'LIMIT_A: 20,')

    const result = await checkLimits(root)
    expect(result.ok).toBe(false)
    expect(result.problems).toContain('한도 불일치: LIMIT_A (spec=10, code=20)')
  })

  it('양방향 누락을 검출한다', async () => {
    const root = await createFixture('LIMIT_A: 1,', 'LIMIT_B: 2,')

    const result = await checkLimits(root)
    expect(result.problems).toEqual([
      '10_NFR.md 누락: LIMIT_B',
      'limits.ts 누락: LIMIT_A',
    ])
  })
})
