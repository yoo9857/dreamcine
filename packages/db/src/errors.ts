import { AppError } from '@aidream/core'

interface PrismaErrorShape {
  code?: unknown
  errorCode?: unknown
  name?: unknown
  meta?: unknown
}

/**
 * 연결 자체가 안 되면 Prisma 는 `PrismaClientInitializationError` 를 던진다.
 * 6.19.3 기준 이 오류에는 `code` 도 `errorCode` 도 없어서 **이름이 유일한
 * 식별자**다. 이름을 안 보면 DB 다운이 500 E_INTERNAL 로 나가고, 클라이언트는
 * 재시도 가능한 장애라는 것을 알 수 없다. (O02_EXCEPTION_POLICY.md §4-1)
 */
const UNAVAILABLE_ERROR_NAMES: ReadonlySet<string> = new Set([
  'PrismaClientInitializationError',
])

function prismaErrorName(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null
  }
  const { name } = error as PrismaErrorShape
  return typeof name === 'string' ? name : null
}

function prismaCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null
  }

  const { code, errorCode } = error as PrismaErrorShape
  if (typeof code === 'string') {
    return code
  }
  return typeof errorCode === 'string' ? errorCode : null
}

function prismaMeta(error: unknown): Record<string, unknown> | undefined {
  if (typeof error !== 'object' || error === null || !('meta' in error)) {
    return undefined
  }

  const { meta } = error as PrismaErrorShape
  return typeof meta === 'object' && meta !== null
    ? (meta as Record<string, unknown>)
    : undefined
}

export function mapPrismaError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  const name = prismaErrorName(error)
  if (name !== null && UNAVAILABLE_ERROR_NAMES.has(name)) {
    return new AppError('E_DB_UNAVAILABLE', { prismaError: name }, error)
  }

  const code = prismaCode(error)
  const meta = prismaMeta(error)

  switch (code) {
    case null:
      return new AppError('E_INTERNAL', undefined, error)
    case 'P2002':
      return new AppError(
        'E_DB_CONFLICT',
        { prismaCode: code, fields: meta?.target ?? [] },
        error,
      )
    case 'P2003':
      return new AppError(
        'E_DB_CONFLICT',
        { prismaCode: code, field: meta?.field_name },
        error,
      )
    case 'P2025':
      return new AppError('E_NOT_FOUND', { prismaCode: code }, error)
    case 'P1001':
    case 'P1002':
    case 'P2024':
      return new AppError('E_DB_UNAVAILABLE', { prismaCode: code }, error)
    case 'P2028':
      return new AppError('E_DB_CONFLICT', { prismaCode: code }, error)
    default:
      return new AppError('E_INTERNAL', { prismaCode: code }, error)
  }
}

export function throwDbError(error: unknown): never {
  throw mapPrismaError(error)
}

export async function executeDb<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation()
  } catch (error: unknown) {
    throwDbError(error)
  }
}
