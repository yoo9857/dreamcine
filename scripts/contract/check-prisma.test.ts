import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import {
  checkPrismaBootstrap,
  checkPrismaContract,
  type PrismaRunner,
} from './check-prisma.js'

const temporaryRoots: string[] = []

async function createContractFixture(
  migrationSql = 'SELECT 1;',
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'aidream-prisma-contract-'))
  temporaryRoots.push(root)
  const prismaDirectory = join(root, 'prisma')
  const migrationDirectory = join(
    prismaDirectory,
    'migrations',
    '20260821000000_t02_initial',
  )
  await mkdir(migrationDirectory, { recursive: true })
  await writeFile(join(prismaDirectory, 'schema.prisma'), 'schema')
  await writeFile(join(migrationDirectory, 'migration.sql'), migrationSql)
  return root
}

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

describe('checkPrismaContract', () => {
  it('산출물이 전혀 없는 T00 부트스트랩 상태를 그대로 승인한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-prisma-contract-empty-'))
    temporaryRoots.push(root)
    const runner: PrismaRunner = () =>
      Promise.reject(new Error('runner must not be called'))

    await expect(checkPrismaContract(root, runner)).resolves.toEqual({
      ok: true,
      problems: [],
    })
  })

  it('스키마만 있는 단계 불일치 결과를 그대로 반환한다', async () => {
    const root = await mkdtemp(
      join(tmpdir(), 'aidream-prisma-contract-schema-'),
    )
    temporaryRoots.push(root)
    const prismaDirectory = join(root, 'prisma')
    await mkdir(prismaDirectory, { recursive: true })
    await writeFile(join(prismaDirectory, 'schema.prisma'), 'schema')
    const runner: PrismaRunner = () =>
      Promise.reject(new Error('runner must not be called'))

    const result = await checkPrismaContract(root, runner)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('migrations')
  })

  it('마이그레이션 루트가 비어 있으면 초기 이력 누락으로 거부한다', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aidream-prisma-contract-zero-'))
    temporaryRoots.push(root)
    const prismaDirectory = join(root, 'prisma')
    await mkdir(join(prismaDirectory, 'migrations'), { recursive: true })
    await writeFile(join(prismaDirectory, 'schema.prisma'), 'schema')
    const runner: PrismaRunner = () =>
      Promise.resolve({ stdout: '', stderr: '' })

    const result = await checkPrismaContract(root, runner)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('0개')
  })

  it('validate와 정규화된 migration diff가 일치하면 승인한다', async () => {
    const root = await createContractFixture('SELECT 1;\n')
    const runner: PrismaRunner = (args) =>
      Promise.resolve({
        stdout:
          args[0] === 'validate'
            ? ''
            : '-- CreateSchema\r\nCREATE SCHEMA IF NOT EXISTS "public";\r\n\r\n\r\nSELECT 1;   \r\n',
        stderr: '',
      })

    await expect(checkPrismaContract(root, runner)).resolves.toEqual({
      ok: true,
      problems: [],
    })
  })

  it('schema와 migration SQL 드리프트를 거부한다', async () => {
    const root = await createContractFixture('SELECT 1;')
    const runner: PrismaRunner = (args) =>
      Promise.resolve({
        stdout: args[0] === 'validate' ? '' : 'SELECT 2;',
        stderr: '',
      })

    const result = await checkPrismaContract(root, runner)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('드리프트')
  })

  it('Prisma validate 실패 원인을 보존한다', async () => {
    const root = await createContractFixture()
    const runner: PrismaRunner = () =>
      Promise.reject(new Error('invalid schema'))

    const result = await checkPrismaContract(root, runner)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('validate 실패')
    expect(result.problems[0]).toContain('invalid schema')
  })

  it('migrate diff 실행 실패 원인을 보존한다', async () => {
    const root = await createContractFixture()
    const runner: PrismaRunner = (args) => {
      if (args[0] === 'validate') {
        return Promise.resolve({ stdout: '', stderr: '' })
      }
      return Promise.reject(new Error('diff unavailable'))
    }

    const result = await checkPrismaContract(root, runner)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('migrate diff 실패')
    expect(result.problems[0]).toContain('diff unavailable')
  })

  it('초기 단계에서 마이그레이션 디렉터리가 여러 개면 거부한다', async () => {
    const root = await createContractFixture()
    await mkdir(join(root, 'prisma', 'migrations', '20260822000000_extra'))
    const runner: PrismaRunner = () =>
      Promise.resolve({ stdout: '', stderr: '' })

    const result = await checkPrismaContract(root, runner)
    expect(result.ok).toBe(false)
    expect(result.problems[0]).toContain('2개')
  })

  // Prisma CLI 프로세스를 실제로 띄우므로 기본 5초 경계에 걸려 플레이키했다.
  // 단정은 그대로 두고 시간만 넉넉히 준다. (O06_TESTING_QA.md §6)
  it('현재 저장소의 실제 Prisma CLI 검사를 통과한다', async () => {
    await expect(checkPrismaContract(process.cwd())).resolves.toEqual({
      ok: true,
      problems: [],
    })
  }, 60_000)
})
