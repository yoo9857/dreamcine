import type { ConsentKind } from '@aidream/core'
import { listUserConsents, setUserConsent } from '@aidream/db'
import { createHash } from 'node:crypto'

import {
  MARKETING_CONSENT_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from '@/src/lib/policies'

export interface ConsentPreferences {
  readonly terms: boolean
  readonly privacy: boolean
  readonly marketing: boolean
}

function latestByKind(
  rows: Awaited<ReturnType<typeof listUserConsents>>,
  kind: ConsentKind,
): boolean {
  const row = rows.find((candidate) => candidate.kind === kind)
  return row?.granted === true && row.revokedAt === null
}

export async function getConsentPreferences(
  userId: string,
): Promise<ConsentPreferences> {
  const rows = await listUserConsents(userId)
  return {
    terms: latestByKind(rows, 'TOS'),
    privacy: latestByKind(rows, 'PRIVACY'),
    marketing: latestByKind(rows, 'MARKETING'),
  }
}

function hashIp(ip: string): string | null {
  const secret = process.env.AUTH_SECRET
  if (secret === undefined || secret === '' || ip === 'unknown') return null
  return createHash('sha256').update(`${secret}:${ip}`).digest('hex')
}

export async function updateMarketingConsent(input: {
  readonly userId: string
  readonly granted: boolean
  readonly ip: string
  readonly userAgent: string | null
}): Promise<ConsentPreferences> {
  await setUserConsent({
    userId: input.userId,
    kind: 'MARKETING',
    version: MARKETING_CONSENT_VERSION,
    granted: input.granted,
    ipHash: hashIp(input.ip),
    userAgent: input.userAgent?.slice(0, 500) ?? null,
  })
  return getConsentPreferences(input.userId)
}

export const CONSENT_DOCUMENTS = {
  terms: TERMS_VERSION,
  privacy: PRIVACY_VERSION,
  marketing: MARKETING_CONSENT_VERSION,
} as const
