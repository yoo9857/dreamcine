import { getSessionFromRequest } from '@/src/auth/session'

/** Read the database session without interpreting its opaque token as a JWT. */
export async function GET(request: Request): Promise<Response> {
  const session = await getSessionFromRequest(request)
  return Response.json(
    session === null
      ? null
      : {
          user: {
            ...session.user,
            name: session.user.displayName,
          },
          expires: session.expiresAt.toISOString(),
        },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
