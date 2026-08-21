import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface LimitsCheckResult {
  readonly ok: boolean
  readonly problems: readonly string[]
}

const ASSIGNMENT_PATTERN = /^\s*([A-Z][A-Z0-9_]+):\s*([^,\n]+),/gm

function normalizeExpression(expression: string): string {
  return expression.replace(/\/\/.*$/u, '').replace(/[\s_]/g, '')
}

function extractAssignments(source: string): Map<string, string> {
  const assignments = new Map<string, string>()

  for (const match of source.matchAll(ASSIGNMENT_PATTERN)) {
    const key = match[1]
    const expression = match[2]
    if (key !== undefined && expression !== undefined) {
      assignments.set(key, normalizeExpression(expression))
    }
  }

  return assignments
}

async function readRequired(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch (error: unknown) {
    throw new Error(`한도 계약 파일을 읽을 수 없습니다: ${path}`, {
      cause: error,
    })
  }
}

export async function checkLimits(
  root = process.cwd(),
): Promise<LimitsCheckResult> {
  const absoluteRoot = resolve(root)
  const specPath = join(absoluteRoot, 'docs', '00_SPEC', '10_NFR.md')
  const codePath = join(absoluteRoot, 'packages', 'core', 'src', 'limits.ts')
  const [specSource, codeSource] = await Promise.all([
    readRequired(specPath),
    readRequired(codePath),
  ])
  const expected = extractAssignments(specSource)
  const actual = extractAssignments(codeSource)
  const problems: string[] = []

  for (const [key, expectedExpression] of expected) {
    const actualExpression = actual.get(key)
    if (actualExpression === undefined) {
      problems.push(`limits.ts 누락: ${key}`)
    } else if (actualExpression !== expectedExpression) {
      problems.push(
        `한도 불일치: ${key} (spec=${expectedExpression}, code=${actualExpression})`,
      )
    }
  }

  for (const key of actual.keys()) {
    if (!expected.has(key)) {
      problems.push(`10_NFR.md 누락: ${key}`)
    }
  }

  problems.sort()
  return { ok: problems.length === 0, problems }
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1]
  return (
    entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href
  )
}

async function main(): Promise<void> {
  const result = await checkLimits()

  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`)
    process.exitCode = 1
    return
  }

  process.stdout.write('limits contract: OK\n')
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
