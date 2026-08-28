import { AppError } from '@aidream/core'
import { cancelAccountDeletion as cancelDeletionInDatabase } from '@aidream/db'

export interface CancelAccountDeletionDependencies {
  readonly cancelDeletion: typeof cancelDeletionInDatabase
}

const PRODUCTION_DEPENDENCIES: CancelAccountDeletionDependencies = {
  cancelDeletion: cancelDeletionInDatabase,
}

export async function cancelAccountDeletion(
  input: { readonly token: string; readonly now?: Date },
  dependencies: CancelAccountDeletionDependencies = PRODUCTION_DEPENDENCIES,
): Promise<{ userId: string }> {
  const result = await dependencies.cancelDeletion(
    input.token,
    input.now ?? new Date(),
  )
  if (result === null) {
    throw new AppError('E_VALIDATION', {
      reason: 'deletion-recovery-token-invalid',
    })
  }
  return result
}
