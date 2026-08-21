import type { RouteResult } from './handler'

/**
 * 라우트는 `new Response(...)` 를 직접 만들지 않는다. 직렬화·헤더·캐시 정책은
 * `withRoute` 가 단일 지점에서 처리한다. (05_API_CONTRACT.md §11)
 */
export function ok(body: unknown): RouteResult {
  return { status: 200, body }
}

export function created(body: unknown): RouteResult {
  return { status: 201, body }
}

export function accepted(body: unknown): RouteResult {
  return { status: 202, body }
}

export function noContent(): RouteResult {
  return { status: 204 }
}

/** 커서 페이지네이션 응답. offset 은 쓰지 않는다. (05_API_CONTRACT.md §1) */
export function paginated(
  items: readonly unknown[],
  nextCursor: string | null,
): RouteResult {
  return { status: 200, body: { items, nextCursor } }
}
