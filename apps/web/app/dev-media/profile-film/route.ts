import { createReadStream, existsSync, statSync } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function mediaPath(): string {
  const packageSuffix = path.join('apps', 'web')
  const workspaceRoot = process.cwd().endsWith(packageSuffix)
    ? path.resolve(process.cwd(), '..', '..')
    : process.cwd()
  return path.join(workspaceRoot, 'ohhanbin_opt.mp4')
}

function unavailable(): Response {
  return new Response(null, { status: 404 })
}

export function GET(request: Request): Response {
  if (process.env.NODE_ENV !== 'development') return unavailable()
  const source = mediaPath()
  if (!existsSync(source)) return unavailable()

  const size = statSync(source).size
  const range = request.headers.get('range')
  const headers = new Headers({
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
    'Content-Type': 'video/mp4',
  })

  if (range === null) {
    headers.set('Content-Length', String(size))
    const stream = Readable.toWeb(createReadStream(source))
    return new Response(stream as ReadableStream<Uint8Array>, {
      status: 200,
      headers,
    })
  }

  const match = /^bytes=(\d+)-(\d*)$/u.exec(range)
  if (match === null) return new Response(null, { status: 416 })
  const start = Number(match[1])
  const requestedEnd = match[2] === '' ? size - 1 : Number(match[2])
  const end = Math.min(requestedEnd, size - 1)
  if (!Number.isSafeInteger(start) || start < 0 || start > end) {
    return new Response(null, { status: 416 })
  }

  headers.set('Content-Length', String(end - start + 1))
  headers.set(
    'Content-Range',
    `bytes ${String(start)}-${String(end)}/${String(size)}`,
  )
  const stream = Readable.toWeb(createReadStream(source, { start, end }))
  return new Response(stream as ReadableStream<Uint8Array>, {
    status: 206,
    headers,
  })
}

export function HEAD(): Response {
  if (process.env.NODE_ENV !== 'development') return unavailable()
  const source = mediaPath()
  if (!existsSync(source)) return unavailable()
  return new Response(null, {
    status: 200,
    headers: {
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
      'Content-Length': String(statSync(source).size),
      'Content-Type': 'video/mp4',
    },
  })
}
