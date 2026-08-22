import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { CADDYFILE_PATH, checkProxy, runCli } from './check-proxy.js'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

async function createRoot(content?: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'aidream-proxy-'))
  temporaryRoots.push(root)
  await mkdir(join(root, 'infra', 'caddy'), { recursive: true })
  if (content !== undefined) {
    await writeFile(join(root, CADDYFILE_PATH), content, 'utf8')
  }
  return root
}

const GOOD = `example.com {
\thandle {
\t\treverse_proxy web:3000 {
\t\t\theader_up X-Forwarded-For {remote_host}
\t\t\theader_up X-Real-IP {remote_host}
\t\t\thealth_uri /api/health
\t\t}
\t}
}
`

describe('checkProxy', () => {
  it('XFF 를 덮어쓰면 통과한다', async () => {
    const root = await createRoot(GOOD)

    await expect(checkProxy(root)).resolves.toEqual({ ok: true, problems: [] })
  })

  it('XFF 덮어쓰기가 없으면 신고한다', async () => {
    const root = await createRoot(
      GOOD.replace('\t\t\theader_up X-Forwarded-For {remote_host}\n', ''),
    )

    const result = await checkProxy(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('reverse_proxy')
    expect(result.problems[0]).toContain('X-Forwarded-For')
  })

  it('주석으로만 적혀 있으면 통과시키지 않는다', async () => {
    // 지시문처럼 보이는 글자가 파일에 있다는 것만으로 통과하면 가드가 아니다.
    const root = await createRoot(
      GOOD.replace(
        '\t\t\theader_up X-Forwarded-For {remote_host}',
        '\t\t\t# header_up X-Forwarded-For {remote_host}',
      ),
    )

    await expect(checkProxy(root)).resolves.toMatchObject({ ok: false })
  })

  it('X-Real-IP 만 있어도 통과시키지 않는다', async () => {
    // 수정 전 Caddyfile 이 정확히 이 상태였다. (OBS-006)
    const root = await createRoot(
      GOOD.replace('\t\t\theader_up X-Forwarded-For {remote_host}\n', ''),
    )

    await expect(checkProxy(root)).resolves.toMatchObject({ ok: false })
  })

  it('reverse_proxy 블록이 여러 개면 모두 검사한다', async () => {
    const root = await createRoot(
      `${GOOD}\nadmin.example.com {\n\treverse_proxy admin:4000 {\n\t\theader_up X-Real-IP {remote_host}\n\t}\n}\n`,
    )

    const result = await checkProxy(root)
    expect(result.ok).toBe(false)
    expect(result.problems).toHaveLength(1)
  })

  it('reverse_proxy 가 하나도 없으면 검사 불가로 실패시킨다', async () => {
    // 조용히 통과하면 "검사했다" 는 착각이 남는다.
    const root = await createRoot('example.com {\n\trespond "hi"\n}\n')

    const result = await checkProxy(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('reverse_proxy')
  })

  it('파일이 없으면 신고한다', async () => {
    const root = await createRoot()

    const result = await checkProxy(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain(CADDYFILE_PATH)
  })

  it('CLI 는 통과하면 0 으로 끝난다', async () => {
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    process.exitCode = undefined
    try {
      await runCli()
      expect(process.exitCode).toBeUndefined()
      expect(out.mock.calls.flat().join('')).toContain('OK')
    } finally {
      out.mockRestore()
      process.exitCode = undefined
    }
  })

  it('CLI 는 실패하면 1 로 끝난다', async () => {
    // 종료 코드가 틀리면 프록시가 뚫린 채로 CI 가 조용히 통과한다.
    const root = await createRoot('example.com {\n\trespond "hi"\n}\n')
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root)
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    process.exitCode = undefined
    try {
      await runCli()
      expect(process.exitCode).toBe(1)
      expect(err.mock.calls.flat().join('')).toContain('reverse_proxy')
    } finally {
      cwd.mockRestore()
      err.mockRestore()
      process.exitCode = undefined
    }
  })
})
