import { robotsTxt } from '@/src/lib/seo/robots'

// Resolve APP_URL on the server, never from the image-build environment.
export const dynamic = 'force-dynamic'

export function GET(): Response {
  return new Response(robotsTxt(), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  })
}
