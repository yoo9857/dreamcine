import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkErrorCatalog } from './check-error-catalog.js'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

async function createFixture(catalog: string, codes: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'aidream-errors-'))
  temporaryRoots.push(root)
  const catalogDirectory = join(root, 'docs', '00_SPEC')
  const codeDirectory = join(root, 'packages', 'core', 'src', 'errors')
  await Promise.all([
    mkdir(catalogDirectory, { recursive: true }),
    mkdir(codeDirectory, { recursive: true }),
  ])
  await Promise.all([
    writeFile(join(catalogDirectory, '09_ERROR_CATALOG.md'), catalog),
    writeFile(join(codeDirectory, 'codes.ts'), codes),
  ])
  return root
}

describe('checkErrorCatalog', () => {
  it('동일한 코드 집합을 승인한다', async () => {
    const root = await createFixture(
      '| `E_ONE` |\n| `E_TWO` |',
      "export const ERROR_CODES = ['E_ONE', 'E_TWO'] as const",
    )

    await expect(checkErrorCatalog(root)).resolves.toEqual({
      ok: true,
      problems: [],
    })
  })

  it('코드 구현의 누락을 검출한다', async () => {
    const root = await createFixture(
      '| `E_ONE` |\n| `E_TWO` |',
      "export const ERROR_CODES = ['E_ONE'] as const",
    )

    await expect(checkErrorCatalog(root)).resolves.toEqual({
      ok: false,
      problems: ['codes.ts 누락: E_TWO'],
    })
  })

  it('카탈로그의 누락을 반대 방향으로 검출한다', async () => {
    const root = await createFixture(
      '| `E_ONE` |',
      "export const ERROR_CODES = ['E_ONE', 'E_EXTRA'] as const",
    )

    await expect(checkErrorCatalog(root)).resolves.toEqual({
      ok: false,
      problems: ['카탈로그 누락: E_EXTRA'],
    })
  })
})
