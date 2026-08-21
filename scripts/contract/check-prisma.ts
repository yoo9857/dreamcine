import { stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface PrismaBootstrapResult {
  readonly ok: boolean
  readonly problems: readonly string[]
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch (error: unknown) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false
    }
    throw new Error(`Prisma 계약 경로를 확인할 수 없습니다: ${path}`, {
      cause: error,
    })
  }
}

export async function checkPrismaBootstrap(
  root = process.cwd(),
): Promise<PrismaBootstrapResult> {
  const absoluteRoot = resolve(root)
  const schemaExists = await exists(
    join(absoluteRoot, 'prisma', 'schema.prisma'),
  )
  const migrationsExist = await exists(
    join(absoluteRoot, 'prisma', 'migrations'),
  )
  const problems: string[] = []

  if (schemaExists !== migrationsExist) {
    problems.push(
      schemaExists
        ? 'schema.prisma가 있지만 prisma/migrations가 없습니다'
        : 'prisma/migrations가 있지만 schema.prisma가 없습니다',
    )
  }

  if (schemaExists && migrationsExist) {
    problems.push(
      'Prisma 산출물이 존재합니다. T02에서 실제 validate와 migration diff 검사기로 교체해야 합니다',
    )
  }

  return { ok: problems.length === 0, problems }
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1]
  return (
    entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href
  )
}

async function main(): Promise<void> {
  const result = await checkPrismaBootstrap()
  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write('prisma bootstrap contract: OK\n')
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
