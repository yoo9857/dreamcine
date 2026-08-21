import { PrismaClient } from '@prisma/client'

interface PrismaGlobalCache {
  aidreamPrisma?: PrismaClient
}

const prismaGlobal = globalThis as typeof globalThis & PrismaGlobalCache

export const db =
  prismaGlobal.aidreamPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  prismaGlobal.aidreamPrisma = db
}
