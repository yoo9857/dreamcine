import { NotImplementedError } from '@aidream/core'

export function checkDisk(
  directory: string,
  originalSizeBytes: number,
): Promise<void> {
  void directory
  void originalSizeBytes
  throw new NotImplementedError('T06:checkDisk')
}
