import { readdir, readFile } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface DependencyCheckResult {
  readonly ok: boolean
  readonly problems: readonly string[]
}

interface PackageManifest {
  readonly name?: string
  readonly dependencies?: Record<string, string>
  readonly devDependencies?: Record<string, string>
  readonly peerDependencies?: Record<string, string>
  readonly optionalDependencies?: Record<string, string>
}

const DEPENDENCY_EVIDENCE: Readonly<Record<string, RegExp>> = {
  next: /Next\.js/u,
  react: /React|Next\.js/u,
  'react-dom': /React|Next\.js/u,
  tailwindcss: /Tailwind CSS/u,
  '@radix-ui/react-dialog': /Radix UI/u,
  'lucide-react': /lucide-react/u,
  'react-hook-form': /react-hook-form/u,
  zod: /zod 3|\bzod\b/u,
  '@tanstack/react-query': /@tanstack\/react-query/u,
  zustand: /zustand/u,
  'hls.js': /hls\.js/u,
  'date-fns': /date-fns/u,
  'next-auth': /next-auth/u,
  '@node-rs/argon2': /@node-rs\/argon2/u,
  prisma: /Prisma 5/u,
  '@prisma/client': /Prisma 5/u,
  bullmq: /BullMQ 5/u,
  '@aws-sdk/client-s3': /@aws-sdk\/client-s3/u,
  '@aws-sdk/s3-request-presigner': /@aws-sdk\/s3-request-presigner/u,
  pino: /pino/u,
  'prom-client': /prom-client/u,
  nodemailer: /nodemailer/u,
  sharp: /sharp/u,
  vitest: /Vitest 2/u,
  '@vitest/coverage-v8': /Vitest v8 provider/u,
  '@testcontainers/postgresql': /@testcontainers\/postgresql/u,
  '@playwright/test': /Playwright/u,
  '@testing-library/react': /@testing-library\/react/u,
  msw: /\bmsw\b/u,
  eslint: /ESLint 9/u,
  '@eslint/js': /ESLint 9/u,
  'typescript-eslint': /@typescript-eslint/u,
  '@typescript-eslint/parser': /@typescript-eslint/u,
  '@typescript-eslint/eslint-plugin': /@typescript-eslint/u,
  'eslint-config-prettier': /Prettier 3/u,
  prettier: /Prettier 3/u,
  'dependency-cruiser': /dependency-cruiser/u,
  '@commitlint/cli': /commitlint/u,
  '@commitlint/config-conventional': /commitlint/u,
  husky: /husky/u,
  typescript: /TypeScript/u,
  '@types/node': /Node\.js/u,
  tsx: /\btsx\b/u,
  turbo: /turbo\.json/u,
}

const TYPES_PREFIX = '@types/'

/**
 * 타입 전용 동반 패키지(`@types/{X}`)는 런타임 패키지 `{X}` 가 허용 목록에
 * 있을 때만 통과한다. `@types/node` 처럼 자체 등재된 항목은 그 근거를 우선한다.
 * 승인되지 않은 런타임 패키지의 `@types` 는 여전히 거부된다. (DEP-001)
 */
function allowedEvidence(dependency: string): RegExp | undefined {
  const own = DEPENDENCY_EVIDENCE[dependency]
  if (own !== undefined || !dependency.startsWith(TYPES_PREFIX)) {
    return own
  }
  return DEPENDENCY_EVIDENCE[dependency.slice(TYPES_PREFIX.length)]
}

async function readRequired(path: string): Promise<string> {
  try {
    return await readFile(path, 'utf8')
  } catch (error: unknown) {
    throw new Error(`의존성 계약 파일을 읽을 수 없습니다: ${path}`, {
      cause: error,
    })
  }
}

async function listPackageJsonFiles(root: string): Promise<string[]> {
  const files = [join(root, 'package.json')]

  for (const workspaceDirectory of ['apps', 'packages']) {
    const directory = join(root, workspaceDirectory)
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error: unknown) {
      throw new Error(`workspace 디렉터리를 읽을 수 없습니다: ${directory}`, {
        cause: error,
      })
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        files.push(join(directory, entry.name, 'package.json'))
      }
    }
  }

  return files
}

function directDependencies(manifest: PackageManifest): string[] {
  return [
    ...Object.keys(manifest.dependencies ?? {}),
    ...Object.keys(manifest.devDependencies ?? {}),
    ...Object.keys(manifest.peerDependencies ?? {}),
    ...Object.keys(manifest.optionalDependencies ?? {}),
  ]
}

export async function checkDeps(
  root = process.cwd(),
): Promise<DependencyCheckResult> {
  const absoluteRoot = resolve(root)
  const packageFiles = await listPackageJsonFiles(absoluteRoot)
  const contractPaths = [
    join(absoluteRoot, 'docs', '00_SPEC', '03_TECH_STACK.md'),
    join(absoluteRoot, 'docs', '10_TASKS', 'T00_BOOTSTRAP.md'),
    join(absoluteRoot, 'docs', 'HARNESS.md'),
  ]
  const contractSource = (
    await Promise.all(contractPaths.map(readRequired))
  ).join('\n')
  const manifests = await Promise.all(
    packageFiles.map(async (path) => {
      const source = await readRequired(path)
      let manifest: PackageManifest
      try {
        manifest = JSON.parse(source) as PackageManifest
      } catch (error: unknown) {
        throw new Error(`package.json을 파싱할 수 없습니다: ${path}`, {
          cause: error,
        })
      }
      return { path, manifest }
    }),
  )
  const workspacePackages = new Set(
    manifests
      .map(({ manifest }) => manifest.name)
      .filter((name): name is string => name !== undefined),
  )
  const problems: string[] = []

  for (const { path, manifest } of manifests) {
    for (const dependency of directDependencies(manifest)) {
      if (dependency.startsWith('@aidream/')) {
        if (!workspacePackages.has(dependency)) {
          problems.push(
            `존재하지 않는 workspace 의존성: ${relative(absoluteRoot, path)} -> ${dependency}`,
          )
        }
        continue
      }
      const evidence = allowedEvidence(dependency)
      if (evidence?.test(contractSource) !== true) {
        problems.push(
          `허용 목록 밖 의존성: ${relative(absoluteRoot, path)} -> ${dependency}`,
        )
      }
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
  const result = await checkDeps()
  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write('dependency contract: OK\n')
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
