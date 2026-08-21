import { readFile, readdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { countRemaining } from './count-remaining.js'

export interface TaskStatus {
  readonly id: string
  readonly title: string
  /** S1 / S2 / S3 체크 여부. 체크박스가 유일한 원천이다. (HARNESS.md §8) */
  readonly stages: readonly [boolean, boolean, boolean]
  readonly remaining: number
}

const TASK_FILE_PATTERN = /^(T\d{2})_(.+)\.md$/u
const STAGE_PATTERN = /^\s*-\s*\[( |x|X)\]\s*S([123])\b/u
const TABLE_HEADER =
  '| # | 태스크 | S1 Spec | S2 Skeleton | S3 구현 | 잔존 NIE |'

const DONE = '✅'
const TODO = '⬜'

function parseStages(source: string): [boolean, boolean, boolean] {
  const stages: [boolean, boolean, boolean] = [false, false, false]
  for (const line of source.split(/\r?\n/u)) {
    const match = STAGE_PATTERN.exec(line)
    if (match === null) {
      continue
    }
    const checked = match[1] !== ' '
    const index = Number(match[2]) - 1
    if (index >= 0 && index < stages.length) {
      stages[index] = checked
    }
  }
  return stages
}

export async function collectTaskStatuses(root: string): Promise<TaskStatus[]> {
  const absoluteRoot = resolve(root)
  const taskDirectory = join(absoluteRoot, 'docs', '10_TASKS')

  let entries: string[]
  try {
    entries = await readdir(taskDirectory)
  } catch (error: unknown) {
    throw new Error(`태스크 문서 경로를 읽을 수 없습니다: ${taskDirectory}`, {
      cause: error,
    })
  }

  const report = await countRemaining(absoluteRoot)
  const statuses: TaskStatus[] = []

  for (const entry of entries.sort()) {
    const match = TASK_FILE_PATTERN.exec(entry)
    if (match === null) {
      continue
    }
    const id = match[1]
    const title = match[2]
    if (id === undefined || title === undefined) {
      continue
    }
    const source = await readFile(join(taskDirectory, entry), 'utf8')
    statuses.push({
      id,
      title,
      stages: parseStages(source),
      remaining: report.byTask[id] ?? 0,
    })
  }

  return statuses
}

export function renderProgressTable(statuses: readonly TaskStatus[]): string {
  const rows = statuses.map((status) => {
    const marks = status.stages.map((done) => (done ? DONE : TODO)).join(' | ')
    const remaining = status.remaining === 0 ? '—' : String(status.remaining)
    return `| ${status.id} | ${status.title} | ${marks} | ${remaining} |`
  })
  return [TABLE_HEADER, '|---|---|---|---|---|---|', ...rows].join('\n')
}

export interface StatusUpdate {
  readonly changed: boolean
  readonly table: string
  readonly statuses: readonly TaskStatus[]
}

/**
 * `docs/INDEX.md` §3 의 진행표를 태스크 문서 체크박스에서 다시 만든다.
 * 사람이 손으로 고치지 않는다 — 이 명령이 유일한 갱신 경로다.
 */
export async function updateIndex(root: string): Promise<StatusUpdate> {
  const absoluteRoot = resolve(root)
  const indexPath = join(absoluteRoot, 'docs', 'INDEX.md')

  let source: string
  try {
    source = await readFile(indexPath, 'utf8')
  } catch (error: unknown) {
    throw new Error(`INDEX 문서를 읽을 수 없습니다: ${indexPath}`, {
      cause: error,
    })
  }

  const statuses = await collectTaskStatuses(absoluteRoot)
  const table = renderProgressTable(statuses)

  const lines = source.split(/\r?\n/u)
  const headerIndex = lines.findIndex((line) => line.trim() === TABLE_HEADER)
  if (headerIndex === -1) {
    throw new Error(
      `INDEX 문서에서 진행표 머리글을 찾을 수 없습니다: ${TABLE_HEADER}`,
    )
  }

  let end = headerIndex
  while (end < lines.length && lines[end]?.startsWith('|') === true) {
    end += 1
  }

  const replaced = [
    ...lines.slice(0, headerIndex),
    ...table.split('\n'),
    ...lines.slice(end),
  ].join('\n')

  if (replaced === source) {
    return { changed: false, table, statuses }
  }
  await writeFile(indexPath, replaced, 'utf8')
  return { changed: true, table, statuses }
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1]
  return (
    entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href
  )
}

async function main(): Promise<void> {
  const result = await updateIndex(process.cwd())
  process.stdout.write(`${result.table}\n`)
  process.stdout.write(
    result.changed
      ? 'docs/INDEX.md progress table: UPDATED\n'
      : 'docs/INDEX.md progress table: already current\n',
  )
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
