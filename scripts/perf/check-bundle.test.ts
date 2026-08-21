import { randomBytes } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import { BUDGET_BYTES, checkBundle, runCli } from './check-bundle.js'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

interface Fixture {
  /** 라우트 → 청크 이름 */
  readonly pages: Readonly<Record<string, readonly string[]>>
  readonly rootMainFiles?: readonly string[]
  /** 청크 이름 → 압축 전 바이트 수 */
  readonly sizes: Readonly<Record<string, number>>
}

async function createFixture(fixture: Fixture): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'aidream-bundle-'))
  temporaryRoots.push(root)
  const nextDir = join(root, 'apps', 'web', '.next')
  await mkdir(join(nextDir, 'static', 'chunks'), { recursive: true })

  const withPath = Object.fromEntries(
    Object.entries(fixture.pages).map(([route, chunks]) => [
      route,
      chunks.map((chunk) => `static/chunks/${chunk}`),
    ]),
  )
  await writeFile(
    join(nextDir, 'app-build-manifest.json'),
    JSON.stringify({ pages: withPath }),
  )
  await writeFile(
    join(nextDir, 'build-manifest.json'),
    JSON.stringify({
      rootMainFiles: (fixture.rootMainFiles ?? []).map(
        (chunk) => `static/chunks/${chunk}`,
      ),
    }),
  )

  for (const [chunk, size] of Object.entries(fixture.sizes)) {
    // 반복되는 내용은 gzip 이 강하게 줄여서 예산 초과가 재현되지 않는다.
    // 압축이 되지 않는 난수로 채워 gzip 크기가 원본과 거의 같게 만든다.
    await writeFile(join(nextDir, 'static', 'chunks', chunk), randomBytes(size))
  }

  return root
}

describe('checkBundle', () => {
  it('예산 안이면 통과한다', async () => {
    const root = await createFixture({
      pages: { '/(auth)/login/page': ['page.js'] },
      sizes: { 'page.js': 1024 },
    })

    const result = await checkBundle(root)
    expect(result.ok).toBe(true)
    expect(result.routes).toHaveLength(1)
    expect(result.routes[0]?.route).toBe('/(auth)/login/page')
  })

  it('레이아웃과 런타임 청크를 함께 센다', async () => {
    // 라우트 청크만 세면 브라우저가 실제로 받는 양보다 적게 나온다.
    const root = await createFixture({
      pages: {
        '/(auth)/login/page': ['page.js'],
        '/layout': ['layout.js'],
      },
      rootMainFiles: ['runtime.js'],
      sizes: {
        'page.js': 400 * 1024,
        'layout.js': 400 * 1024,
        'runtime.js': 400 * 1024,
      },
    })

    const result = await checkBundle(root)
    expect(result.ok).toBe(false)
    expect(result.problems.join('\n')).toContain('초기 JS')
  })

  it('예산을 넘기면 경로와 함께 신고한다', async () => {
    const root = await createFixture({
      pages: { '/heavy/page': ['huge.js'] },
      sizes: { 'huge.js': 900 * 1024 },
    })

    const result = await checkBundle(root)
    expect(result.ok).toBe(false)
    expect(result.problems.join('\n')).toContain('/heavy/page')
    expect(result.routes[0]?.gzipBytes).toBeGreaterThan(BUDGET_BYTES)
  })

  it('polyfills 는 세지 않는다', async () => {
    // noModule 로 실려 지원 브라우저는 받지 않는다. (10_NFR §9)
    const root = await createFixture({
      pages: { '/(auth)/login/page': ['page.js', 'polyfills-abc.js'] },
      sizes: { 'page.js': 1024, 'polyfills-abc.js': 900 * 1024 },
    })

    const result = await checkBundle(root)
    expect(result.ok).toBe(true)
  })

  it('초기 번들에 hls.js 가 있으면 막는다', async () => {
    // 08_UIUX §8 — 플레이어는 동적 import 로 갈라야 한다.
    const root = await createFixture({
      pages: { '/watch/page': ['page.js', 'hls-vendor.js'] },
      sizes: { 'page.js': 1024, 'hls-vendor.js': 1024 },
    })

    const result = await checkBundle(root)
    expect(result.ok).toBe(false)
    expect(result.problems.join('\n')).toContain('hls-')
  })

  it('페이지가 아닌 조각은 예산 대상이 아니다', async () => {
    const root = await createFixture({
      pages: { '/layout': ['layout.js'], '/error': ['error.js'] },
      sizes: { 'layout.js': 1024, 'error.js': 1024 },
    })

    const result = await checkBundle(root)
    expect(result.routes).toEqual([])
    expect(result.problems.join('\n')).toContain(
      '페이지 경로를 찾지 못했습니다',
    )
  })

  it('CLI 는 예산 안이면 0 으로 끝나고 경로별 크기를 보여준다', async () => {
    const root = await createFixture({
      pages: { '/(auth)/login/page': ['page.js'] },
      sizes: { 'page.js': 1024 },
    })
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root)
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    process.exitCode = undefined
    try {
      await runCli()
      const printed = out.mock.calls.flat().join('')
      expect(process.exitCode).toBeUndefined()
      expect(printed).toContain('/(auth)/login/page')
      expect(printed).toContain('bundle budget: OK')
    } finally {
      cwd.mockRestore()
      out.mockRestore()
      process.exitCode = undefined
    }
  })

  it('CLI 는 예산을 넘기면 1 로 끝난다', async () => {
    // 종료 코드가 틀리면 예산을 넘겨도 CI 가 조용히 통과한다.
    const root = await createFixture({
      pages: { '/heavy/page': ['huge.js'] },
      sizes: { 'huge.js': 900 * 1024 },
    })
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue(root)
    const out = vi.spyOn(process.stdout, 'write').mockReturnValue(true)
    const err = vi.spyOn(process.stderr, 'write').mockReturnValue(true)
    process.exitCode = undefined
    try {
      await runCli()
      expect(process.exitCode).toBe(1)
      expect(out.mock.calls.flat().join('')).toContain('FAIL')
      expect(err.mock.calls.flat().join('')).toContain('예산')
    } finally {
      cwd.mockRestore()
      out.mockRestore()
      err.mockRestore()
      process.exitCode = undefined
    }
  })

  it('빌드 전에는 무엇을 해야 하는지 알려준다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-bundle-empty-'))
    temporaryRoots.push(root)

    const result = await checkBundle(root)
    expect(result.ok).toBe(false)
    expect(result.problems.join('\n')).toContain('빌드')
  })
})
