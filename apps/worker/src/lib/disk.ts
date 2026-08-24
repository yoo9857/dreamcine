import { AppError } from '@aidream/core'
import { statfs } from 'node:fs/promises'

export function checkDisk(
  directory: string,
  originalSizeBytes: number,
): Promise<void> {
  return assertDiskCapacity(directory, originalSizeBytes)
}

async function assertDiskCapacity(
  directory: string,
  originalSizeBytes: number,
): Promise<void> {
  if (
    !Number.isSafeInteger(originalSizeBytes) ||
    originalSizeBytes <= 0 ||
    originalSizeBytes > Number.MAX_SAFE_INTEGER / 3
  ) {
    throw new AppError('E_VALIDATION', { field: 'originalSizeBytes' })
  }

  try {
    const stats = await statfs(directory)
    const availableBytes = stats.bavail * stats.bsize
    const requiredBytes = originalSizeBytes * 3
    if (availableBytes < requiredBytes) {
      throw new AppError('E_MEDIA_DISK_FULL', {
        availableBytes,
        requiredBytes,
      })
    }
  } catch (error: unknown) {
    if (error instanceof AppError) throw error
    throw new AppError('E_MEDIA_DISK_FULL', { reason: 'statfs-failed' }, error)
  }
}
