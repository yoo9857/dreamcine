import { AppError } from '@aidream/core'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'

export interface WorkspaceOptions {
  readonly rootDir?: string
  readonly onCleanupError?: (error: unknown) => void
}

export function withWorkspace<T>(
  assetId: string,
  operation: (dir: string) => Promise<T>,
  options: WorkspaceOptions = {},
): Promise<T> {
  return runInWorkspace(assetId, operation, options)
}

async function runInWorkspace<T>(
  assetId: string,
  operation: (dir: string) => Promise<T>,
  options: WorkspaceOptions,
): Promise<T> {
  if (!/^[A-Za-z0-9_-]+$/u.test(assetId)) {
    throw new AppError('E_VALIDATION', { field: 'assetId' })
  }

  const rootDir = options.rootDir ?? process.env.TMP_DIR ?? '/tmp/aidream'
  await mkdir(rootDir, { recursive: true })
  const workspace = await mkdtemp(join(rootDir, `${assetId}-`))
  try {
    return await operation(workspace)
  } finally {
    try {
      await rm(workspace, { recursive: true, force: true })
    } catch (error: unknown) {
      options.onCleanupError?.(error)
    }
  }
}
