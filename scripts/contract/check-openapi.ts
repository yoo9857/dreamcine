import { readdir, stat } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface OpenApiBootstrapResult {
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
    throw new Error(`OpenAPI 계약 경로를 확인할 수 없습니다: ${path}`, {
      cause: error,
    })
  }
}

async function hasRoute(directory: string): Promise<boolean> {
  if (!(await exists(directory))) {
    return false
  }
  const entries = await readdir(directory, { withFileTypes: true })

  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory() && (await hasRoute(path))) {
      return true
    }
    if (
      entry.isFile() &&
      entry.name.startsWith('route.') &&
      ['.ts', '.tsx'].includes(extname(entry.name))
    ) {
      return true
    }
  }
  return false
}

export async function checkOpenApiBootstrap(
  root = process.cwd(),
): Promise<OpenApiBootstrapResult> {
  const absoluteRoot = resolve(root)
  const routesExist = await hasRoute(
    join(absoluteRoot, 'apps', 'web', 'app', 'api'),
  )
  const documentExists = await exists(join(absoluteRoot, 'openapi.json'))
  const problems: string[] = []

  if (routesExist !== documentExists) {
    problems.push(
      routesExist
        ? 'API route가 있지만 openapi.json이 없습니다'
        : 'openapi.json이 있지만 API route가 없습니다',
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
  const result = await checkOpenApiBootstrap()
  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write('openapi bootstrap contract: OK\n')
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
