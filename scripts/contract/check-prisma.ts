import { execFile } from 'node:child_process'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { pathToFileURL } from 'node:url'

const execFileAsync = promisify(execFile)

export type PrismaRunner = (
  args: string[],
  cwd: string,
) => Promise<{ stdout: string; stderr: string }>

const runPrisma: PrismaRunner = async (
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> => {
  const executable =
    process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm'
  const prefix = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm'] : []
  return execFileAsync(executable, [...prefix, 'exec', 'prisma', ...args], {
    cwd,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ??
        'postgresql://contract:contract@127.0.0.1:5432/contract',
    },
    maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
  })
}

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
    problems.push('T02 실제 Prisma 계약 검사를 실행해야 합니다')
  }

  return { ok: problems.length === 0, problems }
}

function normalizeSql(sql: string): string {
  return sql
    .replace(/^-- CreateSchema\s*$/gmu, '')
    .replace(/^CREATE SCHEMA IF NOT EXISTS "public";\s*$/gmu, '')
    .replace(/\r\n/gu, '\n')
    .replace(/[ \t]+$/gmu, '')
    .replace(/\n{3,}/gu, '\n\n')
    .trim()
}

export async function checkPrismaContract(
  root = process.cwd(),
  runner: PrismaRunner = runPrisma,
): Promise<PrismaBootstrapResult> {
  const absoluteRoot = resolve(root)
  const prismaDirectory = join(absoluteRoot, 'prisma')
  const schemaPath = join(prismaDirectory, 'schema.prisma')
  const migrationsPath = join(prismaDirectory, 'migrations')
  const bootstrap = await checkPrismaBootstrap(absoluteRoot)

  if (bootstrap.ok) {
    return bootstrap
  }
  if (!(await exists(schemaPath)) || !(await exists(migrationsPath))) {
    return bootstrap
  }

  try {
    await runner(['validate', '--schema', schemaPath], absoluteRoot)
  } catch (error: unknown) {
    return { ok: false, problems: [`prisma validate 실패: ${String(error)}`] }
  }

  const entries = await readdir(migrationsPath, { withFileTypes: true })
  const migrationDirectories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  if (migrationDirectories.length !== 1) {
    return {
      ok: false,
      problems: [
        `T02 초기 계약은 마이그레이션 디렉터리 1개를 요구합니다: ${String(migrationDirectories.length)}개`,
      ],
    }
  }

  const migrationDirectory = migrationDirectories.at(0)
  if (migrationDirectory === undefined) {
    return { ok: false, problems: ['초기 마이그레이션을 찾을 수 없습니다'] }
  }
  const migrationSql = await readFile(
    join(migrationsPath, migrationDirectory, 'migration.sql'),
    'utf8',
  )
  try {
    const { stdout } = await runner(
      [
        'migrate',
        'diff',
        '--from-empty',
        '--to-schema-datamodel',
        schemaPath,
        '--script',
      ],
      absoluteRoot,
    )
    if (normalizeSql(stdout) !== normalizeSql(migrationSql)) {
      return {
        ok: false,
        problems: [
          'schema.prisma와 초기 migration.sql 사이에 드리프트가 있습니다',
        ],
      }
    }
  } catch (error: unknown) {
    return {
      ok: false,
      problems: [`prisma migrate diff 실패: ${String(error)}`],
    }
  }

  return { ok: true, problems: [] }
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1]
  return (
    entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href
  )
}

async function main(): Promise<void> {
  const result = await checkPrismaContract()
  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write('prisma validate: OK; migration drift: 0\n')
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
