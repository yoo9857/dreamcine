import { readdir, readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface RemainingReport {
  readonly byTask: Record<string, number>
  readonly markers: readonly string[]
  readonly total: number
}

const INCLUDED_EXTENSIONS = new Set(['.ts', '.tsx'])

/** 생성물은 소스가 아니다. `.next`/`.turbo` 는 빌드 산출물이다. */
const EXCLUDED_DIRECTORIES = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.next',
  '.turbo',
])

/**
 * 테스트는 센티넬을 **픽스처로** 쓴다 (예: 501 매핑 검증).
 * 남은 구현량을 세는 것이 목적이므로 테스트 파일은 집계하지 않는다.
 */
const EXCLUDED_FILE_PATTERN = /\.(?:test|spec)\.tsx?$|\.e2e\.tsx?$/u

const MARKER_PATTERN =
  /new\s+NotImplementedError\(\s*['"](T\d{2}):([A-Za-z0-9_]+)['"]/g

async function listSourceFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const path = join(directory, entry.name)

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
        files.push(...(await listSourceFiles(path)))
      }
      continue
    }

    if (
      entry.isFile() &&
      INCLUDED_EXTENSIONS.has(extname(entry.name)) &&
      !EXCLUDED_FILE_PATTERN.test(entry.name)
    ) {
      files.push(path)
    }
  }

  return files
}

export async function countRemaining(root: string): Promise<RemainingReport> {
  const absoluteRoot = resolve(root)
  let files: string[]

  try {
    files = await listSourceFiles(absoluteRoot)
  } catch (error: unknown) {
    throw new Error(`SSS 소스 경로를 읽을 수 없습니다: ${absoluteRoot}`, {
      cause: error,
    })
  }

  const byTask: Record<string, number> = {}
  const markers: string[] = []

  for (const file of files.sort()) {
    const source = await readFile(file, 'utf8')

    for (const match of source.matchAll(MARKER_PATTERN)) {
      const task = match[1]
      const step = match[2]
      if (task === undefined || step === undefined) {
        continue
      }

      byTask[task] = (byTask[task] ?? 0) + 1
      markers.push(`${task}:${step}`)
    }
  }

  return { byTask, markers, total: markers.length }
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1]
  return (
    entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href
  )
}

async function main(): Promise<void> {
  const report = await countRemaining(process.cwd())

  for (const [task, count] of Object.entries(report.byTask).sort()) {
    process.stdout.write(`${task}: ${String(count)}\n`)
  }
  process.stdout.write(`TOTAL=${String(report.total)}\n`)
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
