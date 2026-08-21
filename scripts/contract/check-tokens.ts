import { readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

import { renderThemeCss } from '@aidream/ui/tokens'

export interface TokenCheckResult {
  readonly ok: boolean
  readonly problems: readonly string[]
}

export const THEME_CSS_PATH = join(
  'packages',
  'ui',
  'src',
  'tokens',
  'theme.css',
)

function firstDifference(expected: string, actual: string): string {
  const expectedLines = expected.split('\n')
  const actualLines = actual.split('\n')
  const length = Math.max(expectedLines.length, actualLines.length)

  for (let index = 0; index < length; index += 1) {
    const wanted = expectedLines[index]
    const found = actualLines[index]
    if (wanted !== found) {
      return [
        `${THEME_CSS_PATH}:${String(index + 1)} 이 토큰과 어긋납니다`,
        `  기대: ${wanted ?? '(줄 없음)'}`,
        `  실제: ${found ?? '(줄 없음)'}`,
        '  `pnpm tokens:write` 로 다시 생성하세요.',
      ].join('\n')
    }
  }
  return `${THEME_CSS_PATH} 이 토큰과 어긋납니다`
}

/**
 * `theme.css` 는 토큰에서 파생된 생성물이다. 사람이 CSS 만 고치면 토큰과
 * 조용히 갈라진다 — 그 드리프트를 기계가 막는다. (08_UIUX_SPEC.md §7)
 */
export async function checkTokens(
  root = process.cwd(),
  write = false,
): Promise<TokenCheckResult> {
  const path = join(resolve(root), THEME_CSS_PATH)
  const expected = renderThemeCss()

  if (write) {
    await writeFile(path, expected, 'utf8')
    return { ok: true, problems: [] }
  }

  let actual: string
  try {
    actual = await readFile(path, 'utf8')
  } catch (error: unknown) {
    return {
      ok: false,
      problems: [
        `${THEME_CSS_PATH} 를 읽을 수 없습니다. \`pnpm tokens:write\` 로 생성하세요. (${String(error)})`,
      ],
    }
  }

  if (actual.replace(/\r\n/gu, '\n') === expected) {
    return { ok: true, problems: [] }
  }
  return { ok: false, problems: [firstDifference(expected, actual)] }
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1]
  return (
    entryPath !== undefined && import.meta.url === pathToFileURL(entryPath).href
  )
}

async function main(): Promise<void> {
  const write = process.argv.includes('--write')
  const result = await checkTokens(process.cwd(), write)

  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write(
    write ? 'theme.css: WRITTEN\n' : 'design token contract: OK\n',
  )
}

if (isDirectExecution()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
