import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

export interface ProxyCheckResult {
  readonly ok: boolean
  readonly problems: readonly string[]
}

export const CADDYFILE_PATH = join('infra', 'caddy', 'Caddyfile')

/**
 * 앱은 레이트리밋 신원으로 `X-Forwarded-For` 의 **첫 값**을 쓴다.
 * (07_AUTH_SECURITY.md §8 — 계약이므로 앱 쪽은 바꾸지 않는다.)
 *
 * 그 규칙이 안전한 것은 프록시가 XFF 를 **덮어쓸 때만** 성립한다. Caddy 의
 * `reverse_proxy` 기본 동작은 들어온 XFF 뒤에 덧붙이는 것이어서, 클라이언트가
 * 보낸 값이 첫 값으로 남는다. 그러면 매 요청 XFF 를 바꾸는 것만으로 IP
 * 레이트리밋을 우회할 수 있고, 위협모델 §10 의 크리덴셜 스터핑 방어가
 * 그대로 무력화된다. 한 줄이 빠지면 조용히 뚫리므로 기계가 지킨다. (OBS-006)
 */
const REQUIRED_HEADER_UP = 'header_up X-Forwarded-For {remote_host}'

/** 주석 안에 같은 글자가 있어도 통과하면 안 된다. 실제 지시문만 인정한다. */
const REQUIRED_DIRECTIVE =
  /^[ \t]*header_up[ \t]+X-Forwarded-For[ \t]+\{remote_host\}[ \t]*$/mu

const CSP_DIRECTIVE = /^[ \t]*\??Content-Security-Policy[ \t]+/mu

const REQUIRED_PUBLIC_MEDIA_ROUTES = [
  { path: '/hls/*', bucket: 'S3_BUCKET_HLS' },
  { path: '/thumbs/*', bucket: 'S3_BUCKET_THUMBS' },
] as const

const ONEDAY_SITE_DIRECTIVE = /^\s*onedaytrading\.kr\s*\{\s*$/mu
const ONEDAY_UPSTREAM_DIRECTIVE = /^\s*reverse_proxy\s+oneday-web:3000\s*\{/mu

interface Block {
  readonly startLine: number
  readonly body: string
}

function namedSnippet(source: string, name: string): string | null {
  const lines = source.split(/\r?\n/u)
  const start = lines.findIndex((line) =>
    new RegExp(`^\\s*\\(${name}\\)\\s*\\{\\s*$`, 'u').test(line),
  )
  if (start < 0) return null

  let depth = 0
  const body: string[] = []
  for (let cursor = start; cursor < lines.length; cursor += 1) {
    const current = lines[cursor] ?? ''
    body.push(current)
    depth += (current.match(/\{/gu) ?? []).length
    depth -= (current.match(/\}/gu) ?? []).length
    if (depth === 0) break
  }
  return body.join('\n')
}

/**
 * `reverse_proxy ... {` 부터 짝이 맞는 `}` 까지를 잘라낸다. 중첩 블록이
 * 있어도 첫 `}` 에서 끊기지 않도록 깊이를 센다.
 */
function reverseProxyBlocks(source: string): readonly Block[] {
  const lines = source.split(/\r?\n/u)
  const blocks: Block[] = []

  for (const [index, line] of lines.entries()) {
    if (!/^\s*reverse_proxy\b/u.test(line) || !line.includes('{')) {
      continue
    }

    let depth = 0
    const body: string[] = []
    for (let cursor = index; cursor < lines.length; cursor += 1) {
      const current = lines[cursor] ?? ''
      body.push(current)
      depth += (current.match(/\{/gu) ?? []).length
      depth -= (current.match(/\}/gu) ?? []).length
      if (depth === 0) {
        break
      }
    }
    blocks.push({ startLine: index + 1, body: body.join('\n') })
  }

  return blocks
}

export async function checkProxy(
  root = process.cwd(),
): Promise<ProxyCheckResult> {
  const path = join(resolve(root), CADDYFILE_PATH)

  let source: string
  try {
    source = await readFile(path, 'utf8')
  } catch (error: unknown) {
    return {
      ok: false,
      problems: [`${CADDYFILE_PATH} 를 읽을 수 없습니다. (${String(error)})`],
    }
  }

  const blocks = reverseProxyBlocks(source)
  if (blocks.length === 0) {
    return {
      ok: false,
      problems: [
        `${CADDYFILE_PATH} 에서 reverse_proxy 블록을 찾지 못했습니다. 프록시 신원 규칙을 검사할 수 없습니다.`,
      ],
    }
  }

  const problems = blocks
    .filter((block) => !REQUIRED_DIRECTIVE.test(block.body))
    .map((block) =>
      [
        `${CADDYFILE_PATH}:${String(block.startLine)} reverse_proxy 에 XFF 덮어쓰기가 없습니다`,
        `  필요: ${REQUIRED_HEADER_UP}`,
        '  앱은 XFF 첫 값을 레이트리밋 신원으로 씁니다 (07_AUTH_SECURITY §8).',
        '  Caddy 는 XFF 를 덧붙이므로, 덮어쓰지 않으면 클라이언트가 보낸 값이',
        '  첫 값이 되어 IP 레이트리밋이 우회됩니다. (OBS-006)',
      ].join('\n'),
    )

  const sharedSecurityHeaders = namedSnippet(source, 'security_headers')
  if (
    sharedSecurityHeaders !== null &&
    CSP_DIRECTIVE.test(sharedSecurityHeaders)
  ) {
    problems.push(
      `${CADDYFILE_PATH}: shared security_headers must not overwrite the app nonce CSP.`,
    )
  }

  for (const route of REQUIRED_PUBLIC_MEDIA_ROUTES) {
    const escapedPath = route.path.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    const handle = new RegExp(
      `^[ \\t]*handle[ \\t]+${escapedPath}[ \\t]*\\{`,
      'mu',
    )
    if (!handle.test(source)) {
      problems.push(
        `${CADDYFILE_PATH}: public media route ${route.path} is missing.`,
      )
    }
    if (!source.includes(`/{$${route.bucket}}{uri}`)) {
      problems.push(
        `${CADDYFILE_PATH}: ${route.path} must map through ${route.bucket}.`,
      )
    }
  }

  if (!ONEDAY_SITE_DIRECTIVE.test(source)) {
    problems.push(
      `${CADDYFILE_PATH}: shared proxy route onedaytrading.kr is missing.`,
    )
  }
  if (!blocks.some((block) => ONEDAY_UPSTREAM_DIRECTIVE.test(block.body))) {
    problems.push(
      `${CADDYFILE_PATH}: onedaytrading.kr must proxy to oneday-web:3000.`,
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

/**
 * CLI 진입점. 종료 코드가 곧 게이트의 판정이다 — 문제를 찾고도 0 으로 끝나면
 * CI 가 조용히 통과한다. 그래서 테스트가 이 함수를 직접 부른다.
 */
export async function runCli(): Promise<void> {
  const result = await checkProxy()

  if (!result.ok) {
    process.stderr.write(`${result.problems.join('\n')}\n`)
    process.exitCode = 1
    return
  }
  process.stdout.write('proxy identity contract: OK\n')
}

if (isDirectExecution()) {
  runCli().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  })
}
