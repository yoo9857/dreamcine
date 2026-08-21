import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { countRemaining } from './count-remaining.js'

const temporaryRoots: string[] = []

function sentinel(marker: string, quote: "'" | '"' = "'"): string {
  return ['new', ' NotImplementedError(', quote, marker, quote, ')'].join('')
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

describe('countRemaining', () => {
  it('TS/TSX 소스의 마커를 태스크별로 집계한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-sss-'))
    temporaryRoots.push(root)
    await mkdir(join(root, 'packages', 'sample', 'src'), { recursive: true })
    await writeFile(
      join(root, 'packages', 'sample', 'src', 'one.ts'),
      `${sentinel('T00:alpha')}\n${sentinel('T01:beta', '"')}`,
    )
    await writeFile(
      join(root, 'packages', 'sample', 'src', 'two.tsx'),
      sentinel('T00:gamma'),
    )

    await expect(countRemaining(root)).resolves.toEqual({
      byTask: { T00: 2, T01: 1 },
      markers: ['T00:alpha', 'T01:beta', 'T00:gamma'],
      total: 3,
    })
  })

  it('제외 디렉터리와 다른 확장자를 무시한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-sss-'))
    temporaryRoots.push(root)
    await mkdir(join(root, 'dist'), { recursive: true })
    await writeFile(join(root, 'dist', 'ignored.ts'), sentinel('T99:ignored'))
    await writeFile(join(root, 'ignored.md'), sentinel('T99:ignored'))

    await expect(countRemaining(root)).resolves.toEqual({
      byTask: {},
      markers: [],
      total: 0,
    })
  })

  it('존재하지 않는 루트는 경로가 포함된 오류로 거부한다', async () => {
    const root = join(tmpdir(), 'aidream-missing-root')

    await expect(countRemaining(root)).rejects.toThrow(root)
  })
})
