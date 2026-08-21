import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface ContractCheckResult {
  readonly ok: boolean
  readonly problems: readonly string[]
}

const ERROR_CODE_PATTERN = /['`](E_[A-Z0-9_]+)['`]/g

function extractCodes(source: string): Set<string> {
  return new Set(
    [...source.matchAll(ERROR_CODE_PATTERN)]
      .map((match) => match[1])
      .filter((code): code is string => code !== undefined),
  )
}

async function readRequired(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch (error: unknown) {
    throw new Error(`에러코드 계약 파일을 읽을 수 없습니다: ${path}`, {
      cause: error,
    })
  }
}

export async function checkErrorCatalog(
  root = process.cwd(),
): Promise<ContractCheckResult> {
  const absoluteRoot = resolve(root)
  const catalogPath = join(
    absoluteRoot,
    'docs',
    '00_SPEC',
    '09_ERROR_CATALOG.md',
  )
  const codePath = join(
    absoluteRoot,
    'packages',
    'core',
    'src',
    'errors',
    'codes.ts',
  )
  const [catalogSource, codeSource] = await Promise.all([
    readRequired(catalogPath),
    readRequired(codePath),
  ])
  const catalogCodes = extractCodes(catalogSource)
  const implementationCodes = extractCodes(codeSource)
  const missingInCode = [...catalogCodes]
    .filter((code) => !implementationCodes.has(code))
    .sort()
  const missingInCatalog = [...implementationCodes]
    .filter((code) => !catalogCodes.has(code))
    .sort()
  const problems = [
    ...missingInCode.map((code) => `codes.ts 누락: ${code}`),
    ...missingInCatalog.map((code) => `카탈로그 누락: ${code}`),
  ]

  return { ok: problems.length === 0, problems }
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1]
  return (
    entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href
  )
}

async function main(): Promise<void> {
  const result = await checkErrorCatalog()

  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`)
    process.exitCode = 1
    return
  }

  process.stdout.write('error catalog contract: OK\n')
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
