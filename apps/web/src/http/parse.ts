import type { ZodType } from 'zod'

/**
 * 모든 외부 입력의 유일한 관문. (07_AUTH_SECURITY.md §5)
 *
 * `ZodError` 는 잡지 않고 그대로 올린다. `withRoute` 가 한 곳에서
 * `E_VALIDATION` + `fields` 로 변환한다.
 */
export function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  return schema.parse(body)
}

/** 같은 키가 여러 번 오면 배열로 넘긴다. 그 외에는 단일 문자열이다. */
export function parseQuery<T>(schema: ZodType<T>, query: URLSearchParams): T {
  const raw: Record<string, string | string[]> = {}
  for (const key of new Set(query.keys())) {
    const values = query.getAll(key)
    raw[key] = values.length > 1 ? values : (values[0] ?? '')
  }
  return schema.parse(raw)
}
