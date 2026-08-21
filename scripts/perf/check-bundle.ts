import { gzipSync } from 'node:zlib'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface RouteBudget {
  readonly route: string
  readonly gzipBytes: number
  readonly ok: boolean
}

export interface BundleCheckResult {
  readonly ok: boolean
  readonly routes: readonly RouteBudget[]
  readonly problems: readonly string[]
}

/** 10_NFR.md §1 — 초기 JS ≤ 200KB gzip. */
export const BUDGET_BYTES = 200 * 1024

/**
 * `polyfills` 는 `noModule` 로 실린다. 10_NFR.md §9 의 지원 브라우저는
 * 전부 ES 모듈을 이해하므로 받지 않는다. 초기 JS 측정에서 제외한다.
 */
const EXCLUDED_MARKER = 'polyfills'

/**
 * 08_UIUX_SPEC.md §8 — hls.js 는 초기 번들에 없어야 한다. 동적 import 로
 * 갈라두지 않으면 플레이어를 안 보는 사용자도 그 무게를 받는다.
 */
export const FORBIDDEN_IN_INITIAL = ['hls.js', 'hls-'] as const

interface AppBuildManifest {
  readonly pages: Readonly<Record<string, readonly string[]>>
}

interface BuildManifest {
  readonly rootMainFiles?: readonly string[]
}

async function readJson<T>(path: string, label: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch (error: unknown) {
    throw new Error(
      `${label} 을 읽을 수 없습니다. 먼저 web 을 빌드하세요: ${path}`,
      { cause: error },
    )
  }
}

async function gzipSize(path: string): Promise<number> {
  try {
    return gzipSync(await readFile(path), { level: 9 }).byteLength
  } catch (error: unknown) {
    throw new Error(`번들 파일을 읽을 수 없습니다: ${path}`, { cause: error })
  }
}

export async function checkBundle(
  root = process.cwd(),
): Promise<BundleCheckResult> {
  const nextDir = join(resolve(root), 'apps', 'web', '.next')
  const manifestPath = join(nextDir, 'app-build-manifest.json')

  let manifest: AppBuildManifest
  let shared: BuildManifest
  try {
    manifest = await readJson<AppBuildManifest>(
      manifestPath,
      'app 빌드 매니페스트',
    )
    shared = await readJson<BuildManifest>(
      join(nextDir, 'build-manifest.json'),
      '빌드 매니페스트',
    )
  } catch (error: unknown) {
    return {
      ok: false,
      routes: [],
      problems: [error instanceof Error ? error.message : String(error)],
    }
  }

  /**
   * 브라우저가 실제로 받는 것은 세 묶음의 **합집합**이다 —
   * 라우트 청크 + 루트 레이아웃 청크 + 프레임워크 런타임.
   * 라우트 청크만 세면 50KB 가까이 과소보고되고, 예산 가드가 거짓 안심을 준다.
   */
  const alwaysLoaded = [
    ...(manifest.pages['/layout'] ?? []),
    ...(shared.rootMainFiles ?? []),
  ]

  const cache = new Map<string, number>()
  const routes: RouteBudget[] = []
  const problems: string[] = []

  for (const [route, files] of Object.entries(manifest.pages)) {
    // `/layout` 같은 조각은 그 자체로 방문되는 경로가 아니다.
    if (!route.endsWith('/page')) {
      continue
    }

    let total = 0
    for (const file of new Set([...files, ...alwaysLoaded])) {
      if (!file.endsWith('.js') || file.includes(EXCLUDED_MARKER)) {
        continue
      }
      let size = cache.get(file)
      if (size === undefined) {
        size = await gzipSize(join(nextDir, file))
        cache.set(file, size)
      }
      total += size

      for (const forbidden of FORBIDDEN_IN_INITIAL) {
        if (file.includes(forbidden)) {
          problems.push(`${route}: 초기 번들에 ${forbidden} 가 들어있습니다`)
        }
      }
    }

    const ok = total <= BUDGET_BYTES
    routes.push({ route, gzipBytes: total, ok })
    if (!ok) {
      problems.push(
        `${route}: 초기 JS ${(total / 1024).toFixed(1)}KB gz > 예산 ${String(BUDGET_BYTES / 1024)}KB (10_NFR §1)`,
      )
    }
  }

  if (routes.length === 0) {
    problems.push('매니페스트에서 페이지 경로를 찾지 못했습니다')
  }

  return { ok: problems.length === 0, routes, problems }
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1]
  return (
    entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href
  )
}

/**
 * CLI 진입점. 종료 코드가 곧 게이트의 판정이다 — 문제를 찾고도 0 으로 끝나면
 * CI 가 조용히 통과한다. 그래서 테스트가 이 함수를 직접 부른다.
 */
export async function runCli(): Promise<void> {
  const result = await checkBundle()

  for (const route of [...result.routes].sort(
    (a, b) => b.gzipBytes - a.gzipBytes,
  )) {
    const size = (route.gzipBytes / 1024).toFixed(1).padStart(7)
    process.stdout.write(
      `${route.ok ? 'ok  ' : 'FAIL'} ${size} KB gz  ${route.route}\n`,
    )
  }

  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    `bundle budget: OK (limit ${String(BUDGET_BYTES / 1024)}KB gz)\n`,
  )
}

if (isDirectExecution()) {
  runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
