import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkDeps } from './check-deps.js'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

async function createFixture(
  dependencies: Record<string, string>,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'aidream-deps-'))
  temporaryRoots.push(root)
  await Promise.all([
    mkdir(join(root, 'apps'), { recursive: true }),
    mkdir(join(root, 'packages', 'core'), { recursive: true }),
    mkdir(join(root, 'docs', '00_SPEC'), { recursive: true }),
    mkdir(join(root, 'docs', '10_TASKS'), { recursive: true }),
  ])
  await Promise.all([
    writeFile(
      join(root, 'package.json'),
      JSON.stringify({ name: 'root', private: true, dependencies }),
    ),
    writeFile(
      join(root, 'packages', 'core', 'package.json'),
      JSON.stringify({ name: '@aidream/core', private: true }),
    ),
    writeFile(
      join(root, 'docs', '00_SPEC', '03_TECH_STACK.md'),
      'zod 3 · Radix UI · Tailwind CSS 4',
    ),
    writeFile(join(root, 'docs', '10_TASKS', 'T00_BOOTSTRAP.md'), 'turbo.json'),
    writeFile(join(root, 'docs', 'HARNESS.md'), 'tsx'),
  ])
  return root
}

describe('checkDeps', () => {
  it('문서 근거가 있는 의존성을 승인한다', async () => {
    const root = await createFixture({ zod: '3.25.76', turbo: '2.5.6' })

    await expect(checkDeps(root)).resolves.toEqual({ ok: true, problems: [] })
  })

  it('허용 목록 밖 의존성을 거부한다', async () => {
    const root = await createFixture({ lodash: '4.17.21' })

    const result = await checkDeps(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('lodash')
  })

  it('허용된 런타임 패키지의 타입 전용 동반 패키지를 승인한다', async () => {
    const root = await createFixture({ '@types/zod': '3.25.76' })

    await expect(checkDeps(root)).resolves.toEqual({ ok: true, problems: [] })
  })

  it('허용 목록 밖 패키지의 타입 전용 동반 패키지를 거부한다', async () => {
    const root = await createFixture({ '@types/lodash': '4.17.21' })

    const result = await checkDeps(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('@types/lodash')
  })

  it('계열로 승인된 스코프의 패키지를 승인한다', async () => {
    const root = await createFixture({
      '@radix-ui/react-tabs': '1.0.0',
      '@radix-ui/react-tooltip': '1.0.0',
      '@tailwindcss/postcss': '4.0.0',
    })

    await expect(checkDeps(root)).resolves.toEqual({ ok: true, problems: [] })
  })

  it('승인되지 않은 스코프는 거부한다', async () => {
    const root = await createFixture({ '@mui/material': '5.0.0' })

    const result = await checkDeps(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('@mui/material')
  })

  it('존재하지 않는 내부 패키지를 거부한다', async () => {
    const root = await createFixture({ '@aidream/missing': 'workspace:*' })

    const result = await checkDeps(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('@aidream/missing')
  })
})
