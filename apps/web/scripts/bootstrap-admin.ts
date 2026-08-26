import { bootstrapAdmin } from '@aidream/db'

import { hashPassword } from '../src/auth/password.js'

const REQUIRED_CONFIRMATION = 'CREATE_ADMIN'

async function main(): Promise<void> {
  if (process.env.ADMIN_BOOTSTRAP_CONFIRM !== REQUIRED_CONFIRMATION) {
    throw new Error(
      `Refusing to continue. Set ADMIN_BOOTSTRAP_CONFIRM=${REQUIRED_CONFIRMATION}.`,
    )
  }

  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD
  if (password === undefined || password.length < 10) {
    throw new Error(
      'ADMIN_BOOTSTRAP_PASSWORD must be provided and contain at least 10 characters.',
    )
  }

  const passwordHash = await hashPassword(password)
  const result = await bootstrapAdmin({ passwordHash })
  const action = result.created ? 'created' : 'updated'

  process.stdout.write(
    `Admin account ${action}. Sign in with "admin@admin". Existing sessions were revoked.\n`,
  )
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error'
  process.stderr.write(`Admin bootstrap failed: ${message}\n`)
  process.exitCode = 1
})
