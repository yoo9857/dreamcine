import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface CapacityCheckResult {
  readonly ok: boolean
  readonly problems: readonly string[]
}

const TIERS = ['T0', 'T1', 'T2'] as const
type Tier = (typeof TIERS)[number]

const PROFILE_ROWS = {
  uploadMaxBytes: '업로드 최대 용량',
  uploadDailyBytes: '사용자 일일 업로드 총량',
  uploadHourlyCount: '시간당 업로드 세션',
  videoMaxDurationSec: '영상 최대 길이',
  ladder: '렌디션 래더',
  workerConcurrency: '`WORKER_CONCURRENCY`',
  tmpDirMaxBytes: '트랜스코드 임시공간 상한',
  feedCacheTtlSec: '피드 캐시 TTL',
} as const

type ProfileProperty = keyof typeof PROFILE_ROWS
type ParsedProfiles = Record<Tier, Record<ProfileProperty, string>>

function normalizeMarkdown(value: string): string {
  return value.replaceAll('**', '').trim()
}

function tableRows(source: string): Map<string, readonly string[]> {
  const rows = new Map<string, readonly string[]>()

  for (const line of source.split(/\r?\n/u)) {
    if (!line.startsWith('|')) {
      continue
    }
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => normalizeMarkdown(cell))
    const label = cells[0]
    if (label !== undefined) {
      rows.set(label, cells.slice(1))
    }
  }

  return rows
}

function requiredMatch(value: string, pattern: RegExp, label: string): string {
  const match = pattern.exec(value)?.[1]
  if (match === undefined) {
    throw new Error(`용량 티어 값을 파싱할 수 없습니다: ${label}=${value}`)
  }
  return match
}

function expectedExpression(
  property: ProfileProperty,
  cell: string,
  fallbackLadder: string,
): string {
  switch (property) {
    case 'uploadMaxBytes':
    case 'uploadDailyBytes':
    case 'tmpDirMaxBytes':
      return `${requiredMatch(cell, /(\d+)\s*GB/u, property)}*1024**3`
    case 'uploadHourlyCount':
    case 'workerConcurrency':
      return requiredMatch(cell, /(\d+)/u, property)
    case 'videoMaxDurationSec':
      return (
        /\((\d+)초\)/u.exec(cell)?.[1] ??
        String(Number(requiredMatch(cell, /(\d+)분/u, property)) * 60)
      )
    case 'feedCacheTtlSec':
      return requiredMatch(cell, /(\d+)초/u, property)
    case 'ladder': {
      const renditions = [...cell.matchAll(/(\d+p)/gu)]
        .map((match) => match[1])
        .filter((value): value is string => value !== undefined)
      const expectedCount = Number(
        /\((\d+)단\)/u.exec(cell)?.[1] ?? renditions.length,
      )
      if (renditions.length !== expectedCount) {
        return fallbackLadder
      }
      return `[${renditions.map((value) => `'${value}'`).join(',')}]`
    }
  }
}

function parseSpecProfiles(source: string): ParsedProfiles {
  const rows = tableRows(source)
  const profiles = { T0: {}, T1: {}, T2: {} } as ParsedProfiles
  const t1CodeBlock = /T1:\s*\{([\s\S]*?)\n\s*\},/u.exec(source)?.[1]
  const fallbackLadder = normalizeCodeValue(
    t1CodeBlock === undefined
      ? ''
      : (/^\s*ladder:\s*(.+)$/mu.exec(t1CodeBlock)?.[1] ?? ''),
  )
  if (fallbackLadder === '') {
    throw new Error('용량 스펙 코드 예시에서 T1 ladder를 찾을 수 없습니다')
  }

  for (const [property, label] of Object.entries(PROFILE_ROWS) as [
    ProfileProperty,
    string,
  ][]) {
    const cells = rows.get(label)
    if (cells === undefined || cells.length < TIERS.length) {
      throw new Error(`용량 티어 표 행을 찾을 수 없습니다: ${label}`)
    }
    TIERS.forEach((tier, index) => {
      const cell = cells[index]
      if (cell === undefined) {
        throw new Error(`용량 티어 셀이 없습니다: ${tier}/${label}`)
      }
      profiles[tier][property] = expectedExpression(
        property,
        cell,
        fallbackLadder,
      )
    })
  }

  return profiles
}

function normalizeCodeValue(value: string): string {
  return value.replace(/[\s_]/g, '').replaceAll('"', "'").replace(/,$/u, '')
}

function parseCodeProfiles(source: string): ParsedProfiles {
  const profiles = { T0: {}, T1: {}, T2: {} } as ParsedProfiles

  for (const tier of TIERS) {
    const block = new RegExp(
      `${tier}:\\s*\\{([\\s\\S]*?)\\n\\s*\\},`,
      'u',
    ).exec(source)?.[1]
    if (block === undefined) {
      throw new Error(`capacity.ts 티어 블록을 찾을 수 없습니다: ${tier}`)
    }
    for (const property of Object.keys(PROFILE_ROWS) as ProfileProperty[]) {
      const value = new RegExp(`^\\s*${property}:\\s*(.+)$`, 'mu').exec(
        block,
      )?.[1]
      if (value === undefined) {
        throw new Error(
          `capacity.ts 값을 찾을 수 없습니다: ${tier}/${property}`,
        )
      }
      profiles[tier][property] = normalizeCodeValue(value)
    }
  }

  return profiles
}

async function readRequired(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch (error: unknown) {
    throw new Error(`용량 계약 파일을 읽을 수 없습니다: ${path}`, {
      cause: error,
    })
  }
}

export async function checkCapacity(
  root = process.cwd(),
): Promise<CapacityCheckResult> {
  const absoluteRoot = resolve(root)
  const specPath = join(absoluteRoot, 'docs', '00_SPEC', '11_CAPACITY_TIERS.md')
  const codePath = join(absoluteRoot, 'packages', 'core', 'src', 'capacity.ts')
  const composePath = join(
    absoluteRoot,
    'infra',
    'compose',
    'docker-compose.t0.yml',
  )
  const [specSource, codeSource, composeSource] = await Promise.all([
    readRequired(specPath),
    readRequired(codePath),
    readRequired(composePath),
  ])
  const expected = parseSpecProfiles(specSource)
  const actual = parseCodeProfiles(codeSource)
  const problems: string[] = []

  for (const tier of TIERS) {
    for (const property of Object.keys(PROFILE_ROWS) as ProfileProperty[]) {
      if (actual[tier][property] !== expected[tier][property]) {
        problems.push(
          `용량 불일치: ${tier}/${property} (spec=${expected[tier][property]}, code=${actual[tier][property]})`,
        )
      }
    }
  }

  const t0Cpu = requiredMatch(
    tableRows(specSource).get('워커 CPU 할당')?.[0] ?? '',
    /(\d+(?:\.\d+)?)/u,
    'T0 worker cpus',
  )
  const t0Memory = `${requiredMatch(
    tableRows(specSource).get('워커 메모리 상한')?.[0] ?? '',
    /(\d+)\s*MB/u,
    'T0 worker memory',
  )}m`
  const composeChecks: readonly [string, RegExp][] = [
    ['worker cpus', new RegExp(`cpus:\\s*${t0Cpu}(?:\\s|$)`, 'u')],
    ['worker mem_limit', new RegExp(`mem_limit:\\s*${t0Memory}(?:\\s|$)`, 'u')],
    [
      'WORKER_CONCURRENCY',
      new RegExp(
        `WORKER_CONCURRENCY:\\s*${expected.T0.workerConcurrency}(?:\\s|$)`,
        'u',
      ),
    ],
    ['CAPACITY_TIER', /CAPACITY_TIER:\s*T0(?:\s|$)/u],
  ]

  for (const [label, pattern] of composeChecks) {
    if (!pattern.test(composeSource)) {
      problems.push(`T0 compose 불일치: ${label}`)
    }
  }

  return { ok: problems.length === 0, problems: problems.sort() }
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1]
  return (
    entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href
  )
}

async function main(): Promise<void> {
  const result = await checkCapacity()
  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write('capacity contract: OK\n')
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
