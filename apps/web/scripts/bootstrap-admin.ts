import { hash } from '@node-rs/argon2'
// eslint-disable-next-line no-restricted-imports -- standalone production operator command
import { PrismaClient } from '@prisma/client'

const REQUIRED_CONFIRMATION = 'CREATE_ADMIN'
const ADMIN_HANDLE = 'admin'
const ADMIN_EMAIL = 'admin@admin'
const prisma = new PrismaClient()

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

  const passwordHash = await hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  })
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.user.findUnique({
      where: { handle: ADMIN_HANDLE },
    })

    if (existing !== null && existing.role !== 'ADMIN') {
      throw new Error(
        'The reserved admin handle belongs to a non-admin account; refusing automatic elevation.',
      )
    }

    const user =
      existing === null
        ? await tx.user.create({
            data: {
              handle: ADMIN_HANDLE,
              email: ADMIN_EMAIL,
              emailVerified: new Date(),
              passwordHash,
              displayName: 'Administrator',
              role: 'ADMIN',
              status: 'ACTIVE',
            },
          })
        : await tx.user.update({
            where: { id: existing.id },
            data: {
              email: ADMIN_EMAIL,
              passwordHash,
              emailVerified: existing.emailVerified ?? new Date(),
              status: 'ACTIVE',
              deletedAt: null,
            },
          })

    await tx.session.deleteMany({ where: { userId: user.id } })
    return { created: existing === null }
  })
  const action = result.created ? 'created' : 'updated'

  process.stdout.write(
    `Admin account ${action}. Sign in with "admin@admin". Existing sessions were revoked.\n`,
  )
}

async function run(): Promise<void> {
  try {
    await main()
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    process.stderr.write(`Admin bootstrap failed: ${message}\n`)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

void run()
