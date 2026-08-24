import { NotImplementedError } from '@aidream/core'

export interface WorkspaceOptions {
  readonly rootDir?: string
  readonly onCleanupError?: (error: unknown) => void
}

export function withWorkspace<T>(
  assetId: string,
  operation: (dir: string) => Promise<T>,
  options: WorkspaceOptions = {},
): Promise<T> {
  void assetId
  void operation
  void options
  throw new NotImplementedError('T06:withWorkspace')
}
