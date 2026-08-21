import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  collectTaskStatuses,
  renderProgressTable,
  updateIndex,
} from './status.js'

const temporaryRoots: string[] = []

const TABLE_HEADER =
  '| # | 태스크 | S1 Spec | S2 Skeleton | S3 구현 | 잔존 NIE |'

function sentinel(marker: string): string {
  return ['new', ' NotImplementedError(', "'", marker, "'", ')'].join('')
}

function taskDocument(stages: readonly [boolean, boolean, boolean]): string {
  const mark = (done: boolean): string => (done ? 'x' : ' ')
  return [
    '# T00 — 제목',
    '',
    '## 진행 상태',
    `- [${mark(stages[0])}] S1 Spec 확인`,
    `- [${mark(stages[1])}] S2 Skeleton`,
    `- [${mark(stages[2])}] S3 구현`,
    '',
  ].join('\n')
}

async function createFixture(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'aidream-status-'))
  temporaryRoots.push(root)
  await mkdir(join(root, 'docs', '10_TASKS'), { recursive: true })
  return root
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

describe('collectTaskStatuses', () => {
  it('태스크 문서의 체크박스를 단계별로 읽는다', async () => {
    const root = await createFixture()
    await writeFile(
      join(root, 'docs', '10_TASKS', 'T00_BOOTSTRAP.md'),
      taskDocument([true, true, false]),
    )

    await expect(collectTaskStatuses(root)).resolves.toEqual([
      {
        id: 'T00',
        title: 'BOOTSTRAP',
        stages: [true, true, false],
        remaining: 0,
      },
    ])
  })

  it('태스크 번호순으로 정렬한다', async () => {
    const root = await createFixture()
    for (const name of ['T02_DB.md', 'T00_BOOTSTRAP.md', 'T01_INFRA.md']) {
      await writeFile(
        join(root, 'docs', '10_TASKS', name),
        taskDocument([false, false, false]),
      )
    }

    const statuses = await collectTaskStatuses(root)
    expect(statuses.map((status) => status.id)).toEqual(['T00', 'T01', 'T02'])
  })

  it('잔존 NotImplementedError 를 태스크별로 집계한다', async () => {
    const root = await createFixture()
    await writeFile(
      join(root, 'docs', '10_TASKS', 'T05_UPLOAD.md'),
      taskDocument([true, true, false]),
    )
    await mkdir(join(root, 'apps', 'web'), { recursive: true })
    await writeFile(
      join(root, 'apps', 'web', 'a.ts'),
      `${sentinel('T05:one')}\n${sentinel('T05:two')}`,
    )

    const statuses = await collectTaskStatuses(root)
    expect(statuses[0]?.remaining).toBe(2)
  })

  it('태스크 문서 형식이 아닌 파일은 무시한다', async () => {
    const root = await createFixture()
    await writeFile(join(root, 'docs', '10_TASKS', 'README.md'), '# 안내')

    await expect(collectTaskStatuses(root)).resolves.toEqual([])
  })

  it('존재하지 않는 경로는 경로가 포함된 오류로 거부한다', async () => {
    const root = join(tmpdir(), 'aidream-status-missing')

    await expect(collectTaskStatuses(root)).rejects.toThrow('10_TASKS')
  })
})

describe('renderProgressTable', () => {
  it('완료는 ✅, 미완료는 ⬜ 로 표시한다', () => {
    const table = renderProgressTable([
      {
        id: 'T00',
        title: 'BOOTSTRAP',
        stages: [true, true, true],
        remaining: 0,
      },
      { id: 'T03', title: 'AUTH', stages: [true, false, false], remaining: 7 },
    ])

    expect(table.split('\n')).toEqual([
      TABLE_HEADER,
      '|---|---|---|---|---|---|',
      '| T00 | BOOTSTRAP | ✅ | ✅ | ✅ | — |',
      '| T03 | AUTH | ✅ | ⬜ | ⬜ | 7 |',
    ])
  })

  it('잔존 0 은 대시로 쓴다', () => {
    const table = renderProgressTable([
      { id: 'T09', title: 'FEED', stages: [false, false, false], remaining: 0 },
    ])

    expect(table).toContain('| — |')
  })
})

describe('updateIndex', () => {
  async function writeIndex(root: string, rows: string): Promise<void> {
    await writeFile(
      join(root, 'docs', 'INDEX.md'),
      [
        '## 3. 전체 진행표',
        '',
        TABLE_HEADER,
        '|---|---|---|---|---|---|',
        rows,
        '',
        '범례: ⬜ 미착수',
        '',
      ].join('\n'),
    )
  }

  it('진행표를 체크박스 상태로 다시 쓴다', async () => {
    const root = await createFixture()
    await writeIndex(root, '| T00 | BOOTSTRAP | ⬜ | ⬜ | ⬜ | — |')
    await writeFile(
      join(root, 'docs', '10_TASKS', 'T00_BOOTSTRAP.md'),
      taskDocument([true, true, true]),
    )

    const result = await updateIndex(root)
    expect(result.changed).toBe(true)

    const written = await readFile(join(root, 'docs', 'INDEX.md'), 'utf8')
    expect(written).toContain('| T00 | BOOTSTRAP | ✅ | ✅ | ✅ | — |')
    // 표 밖의 내용은 건드리지 않는다.
    expect(written).toContain('범례: ⬜ 미착수')
    expect(written).toContain('## 3. 전체 진행표')
  })

  it('이미 최신이면 파일을 쓰지 않는다', async () => {
    const root = await createFixture()
    await writeIndex(root, '| T00 | BOOTSTRAP | ✅ | ✅ | ✅ | — |')
    await writeFile(
      join(root, 'docs', '10_TASKS', 'T00_BOOTSTRAP.md'),
      taskDocument([true, true, true]),
    )

    await expect(updateIndex(root)).resolves.toMatchObject({ changed: false })
  })

  it('머리글이 없으면 거부한다', async () => {
    const root = await createFixture()
    await writeFile(join(root, 'docs', 'INDEX.md'), '# 표가 없는 문서')

    await expect(updateIndex(root)).rejects.toThrow('진행표 머리글')
  })

  it('INDEX 문서가 없으면 경로가 포함된 오류로 거부한다', async () => {
    const root = await createFixture()

    await expect(updateIndex(root)).rejects.toThrow('INDEX.md')
  })
})
