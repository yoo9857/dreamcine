import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkOpenApiBootstrap } from './check-openapi.js'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

describe('checkOpenApiBootstrap', () => {
  it('라우트와 문서가 모두 없는 부트스트랩 상태를 승인한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-openapi-'))
    temporaryRoots.push(root)

    await expect(checkOpenApiBootstrap(root)).resolves.toEqual({
      ok: true,
      problems: [],
    })
  })

  it('API route만 생성된 불완전 상태를 거부한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-openapi-'))
    temporaryRoots.push(root)
    const routeDirectory = join(root, 'apps', 'web', 'app', 'api', 'health')
    await mkdir(routeDirectory, { recursive: true })
    await writeFile(join(routeDirectory, 'route.ts'), 'export {}')

    const result = await checkOpenApiBootstrap(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('openapi.json')
  })

  it('OpenAPI 문서만 생성된 불완전 상태를 거부한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-openapi-'))
    temporaryRoots.push(root)
    await writeFile(join(root, 'openapi.json'), '{}')

    const result = await checkOpenApiBootstrap(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('API route')
  })
})
