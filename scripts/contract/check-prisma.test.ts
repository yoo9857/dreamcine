import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { checkPrismaBootstrap } from './check-prisma.js'

const temporaryRoots: string[] = []

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  )
})

describe('checkPrismaBootstrap', () => {
  it('스키마와 마이그레이션이 모두 없는 부트스트랩 상태를 승인한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-prisma-'))
    temporaryRoots.push(root)

    await expect(checkPrismaBootstrap(root)).resolves.toEqual({
      ok: true,
      problems: [],
    })
  })

  it('스키마만 생성된 불완전 상태를 거부한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-prisma-'))
    temporaryRoots.push(root)
    const prismaDirectory = join(root, 'prisma')
    await mkdir(prismaDirectory, { recursive: true })
    await writeFile(join(prismaDirectory, 'schema.prisma'), '')

    const result = await checkPrismaBootstrap(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('migrations')
  })

  it('마이그레이션만 생성된 불완전 상태를 거부한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-prisma-'))
    temporaryRoots.push(root)
    await mkdir(join(root, 'prisma', 'migrations'), { recursive: true })

    const result = await checkPrismaBootstrap(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('schema.prisma')
  })

  it('양쪽 산출물이 생기면 실제 T02 검사기로의 교체를 요구한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-prisma-'))
    temporaryRoots.push(root)
    const prismaDirectory = join(root, 'prisma')
    await mkdir(join(prismaDirectory, 'migrations'), { recursive: true })
    await writeFile(join(prismaDirectory, 'schema.prisma'), '')

    const result = await checkPrismaBootstrap(root)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('T02')
  })
})
