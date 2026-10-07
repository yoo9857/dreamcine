import { db } from '../client.js'
import { executeDb } from '../errors.js'

/** Public metadata only: never select email, applications, drafts or hidden profiles. */
export function lookupHelpCatalog(query: string, viewerId?: string) {
  return executeDb(async () => {
    const owner = {
      status: 'ACTIVE' as const,
      deletedAt: null,
      profileVisibility: 'PUBLIC' as const,
      ...(viewerId === undefined
        ? {}
        : { blockedBy: { none: { blockerId: viewerId } } }),
    }
    const name = { contains: query, mode: 'insensitive' as const }
    const published = {
      status: 'PUBLISHED' as const,
      visibility: 'PUBLIC' as const,
      deletedAt: null,
      publishedAt: { not: null },
    }
    const [works, creators] = await Promise.all([
      db.series.findMany({
        where: {
          deletedAt: null,
          visibility: 'PUBLIC',
          owner,
          episodes: { some: published },
          OR: [
            { title: name },
            { owner: { displayName: name } },
            { owner: { handle: name } },
            { episodes: { some: { ...published, title: name } } },
          ],
        },
        select: {
          id: true,
          title: true,
          synopsis: true,
          owner: { select: { handle: true, displayName: true } },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        take: 3,
      }),
      db.user.findMany({
        where: {
          ...owner,
          role: { in: ['CREATOR', 'PARTNER'] },
          OR: [{ handle: name }, { displayName: name }],
        },
        select: { handle: true, displayName: true, bio: true },
        orderBy: [{ displayName: 'asc' }, { id: 'asc' }],
        take: 3,
      }),
    ])
    return { works, creators }
  })
}
