import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkCapacity } from './check-capacity.js'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

async function createProjectFixture(
  composeTransform?: (source: string) => string,
) {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'aidream-capacity-'))
  temporaryRoots.push(fixtureRoot)
  const files = [
    ['docs/00_SPEC/11_CAPACITY_TIERS.md', 'docs/00_SPEC/11_CAPACITY_TIERS.md'],
    ['packages/core/src/capacity.ts', 'packages/core/src/capacity.ts'],
    [
      'infra/compose/docker-compose.t0.yml',
      'infra/compose/docker-compose.t0.yml',
    ],
  ] as const

  await Promise.all(
    files.map(async ([sourcePath, targetPath]) => {
      const target = join(fixtureRoot, targetPath)
      await mkdir(join(target, '..'), { recursive: true })
      const source = await readFile(sourcePath, 'utf8')
      await writeFile(
        target,
        sourcePath.endsWith('.yml') && composeTransform !== undefined
          ? composeTransform(source)
          : source,
      )
    }),
  )
  return fixtureRoot
}

describe('checkCapacity', () => {
  it('티어표와 코드 및 T0 compose의 일치를 승인한다', async () => {
    const root = await createProjectFixture()

    await expect(checkCapacity(root)).resolves.toEqual({
      ok: true,
      problems: [],
    })
  })

  it('T0 compose 동시성 드리프트를 검출한다', async () => {
    const root = await createProjectFixture((source) =>
      source.replace('WORKER_CONCURRENCY: 1', 'WORKER_CONCURRENCY: 2'),
    )

    const result = await checkCapacity(root)
    expect(result.ok).toBe(false)
    expect(result.problems).toContain('T0 compose 불일치: WORKER_CONCURRENCY')
  })
})
