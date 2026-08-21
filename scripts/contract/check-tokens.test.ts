import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { renderThemeCss } from '@aidream/ui/tokens'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { THEME_CSS_PATH, checkTokens, runCli } from './check-tokens.js'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

async function createRoot(content?: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'aidream-tokens-'))
  temporaryRoots.push(root)
  await mkdir(join(root, 'packages', 'ui', 'src', 'tokens'), {
    recursive: true,
  })
  if (content !== undefined) {
    await writeFile(join(root, THEME_CSS_PATH), content, 'utf8')
  }
  return root
}

describe('checkTokens', () => {
  it('토큰에서 생성한 내용과 같으면 통과한다', async () => {
    const root = await createRoot(renderThemeCss())

    await expect(checkTokens(root)).resolves.toEqual({ ok: true, problems: [] })
  })

  it('한 줄이라도 다르면 어느 줄인지 알려준다', async () => {
    const broken = renderThemeCss().replace('--aidream-bg:', '--oops-bg:')
    const root = await createRoot(broken)

    const result = await checkTokens(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain(THEME_CSS_PATH)
    expect(result.problems[0]).toContain('기대:')
    expect(result.problems[0]).toContain('실제:')
    expect(result.problems[0]).toContain('pnpm tokens:write')
  })

  it('줄이 잘려 있어도 신고한다', async () => {
    const truncated = renderThemeCss().split('\n').slice(0, 5).join('\n')
    const root = await createRoot(truncated)

    const result = await checkTokens(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('줄 없음')
  })

  it('줄이 더 붙어 있어도 신고한다', async () => {
    const root = await createRoot(`${renderThemeCss()}\n/* 사족 */\n`)

    const result = await checkTokens(root)
    expect(result.ok).toBe(false)
    expect(result.problems).toHaveLength(1)
  })

  it('CRLF 로 저장된 파일도 같은 내용으로 본다', async () => {
    // Windows 체크아웃에서 줄바꿈이 바뀌었다고 계약이 깨지면 안 된다.
    const root = await createRoot(renderThemeCss().replaceAll('\n', '\r\n'))

    await expect(checkTokens(root)).resolves.toEqual({ ok: true, problems: [] })
  })

  it('파일이 없으면 무엇을 해야 하는지 알려준다', async () => {
    const root = await createRoot()

    const result = await checkTokens(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('pnpm tokens:write')
  })

  it('--write 는 토큰에서 파일을 다시 만든다', async () => {
    const root = await createRoot('/* 손으로 고친 흔적 */\n')

    await expect(checkTokens(root, true)).resolves.toEqual({
      ok: true,
      problems: [],
    })
    await expect(readFile(join(root, THEME_CSS_PATH), 'utf8')).resolves.toBe(
      renderThemeCss(),
    )
  })

  it('--write 뒤에는 검사가 통과한다', async () => {
    const root = await createRoot('/* 아무 내용 */\n')
    await checkTokens(root, true)

    await expect(checkTokens(root)).resolves.toEqual({ ok: true, problems: [] })
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

  it('CLI 는 실패하면 1 로 끝나고 stderr 에 이유를 쓴다', async () => {
    // 종료 코드가 틀리면 문제를 찾고도 CI 가 조용히 통과한다.
    const root = await createRoot('/* 손으로 고친 흔적 */')
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root)
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    process.exitCode = undefined
    try {
      await runCli()
      expect(process.exitCode).toBe(1)
      expect(err.mock.calls.flat().join('')).toContain('tokens:write')
    } finally {
      cwd.mockRestore()
      err.mockRestore()
      process.exitCode = undefined
    }
  })

  it('생성 경로가 스펙이 지정한 위치다', () => {
    // 02_REPO_LAYOUT §4 — 토큰은 packages/ui/src/tokens 에 있다.
    expect(THEME_CSS_PATH).toContain(join('packages', 'ui', 'src', 'tokens'))
    expect(THEME_CSS_PATH.endsWith('theme.css')).toBe(true)
  })
})
