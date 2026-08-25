import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql'

const execFileAsync = promisify(execFile)

export interface PostgresTestContext {
  readonly container: StartedPostgreSqlContainer
  readonly database: typeof import('../src/client.js').db
  readonly repo: typeof import('../src/index.js')
  readonly originalDatabaseUrl: string | undefined
}

export async function startPostgresTestContext(
  databaseName: string,
): Promise<PostgresTestContext> {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase(databaseName)
    .withUsername(databaseName)
    .withPassword(`${databaseName}_password`)
    .start()
  process.env.DATABASE_URL = `postgresql://${databaseName}:${databaseName}_password@${container.getHost()}:${String(container.getMappedPort(5432))}/${databaseName}?schema=public`
  const executable =
    process.platform === 'win32' ? (process.env.ComSpec ?? 'cmd.exe') : 'pnpm'
  const prefix = process.platform === 'win32' ? ['/d', '/s', '/c', 'pnpm'] : []
  await execFileAsync(
    executable,
    [
      ...prefix,
      'exec',
      'prisma',
      'migrate',
      'deploy',
      '--schema',
      'prisma/schema.prisma',
    ],
    {
      cwd: process.cwd(),
      env: process.env,
      windowsHide: true,
    },
  )
  return {
    container,
    database: (await import('../src/client.js')).db,
    repo: await import('../src/index.js'),
    originalDatabaseUrl,
  }
}

export async function stopPostgresTestContext(
  context: PostgresTestContext | undefined,
): Promise<void> {
  if (context === undefined) return
  await context.database.$disconnect()
  await context.container.stop()
  if (context.originalDatabaseUrl === undefined) delete process.env.DATABASE_URL
  else process.env.DATABASE_URL = context.originalDatabaseUrl
}
