import { AppError } from '@aidream/core'

interface PrismaErrorShape {
  code?: unknown
  meta?: unknown
}

function prismaCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null
  }

  const { code } = error as PrismaErrorShape
  return typeof code === 'string' ? code : null
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
