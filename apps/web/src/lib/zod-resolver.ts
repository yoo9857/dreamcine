import type { FieldErrors, FieldValues, Resolver } from 'react-hook-form'
import type { ZodType } from 'zod'

/**
 * `@hookform/resolvers` 는 03_TECH_STACK 허용 목록에 없다. 필요한 동작이
 * 이 정도라 의존성을 늘리지 않고 직접 잇는다.
 *
 * 스키마의 변환(trim·lowercase·제어문자 제거)을 통과한 값이 제출된다.
 * 그래서 서버가 받는 값과 클라이언트가 보낸 값이 같아진다.
 * (07_AUTH_SECURITY.md §5 — 서버와 클라이언트가 같은 스키마를 쓴다)
 */
export function zodResolver<TValues extends FieldValues>(
  schema: ZodType<TValues>,
): Resolver<TValues> {
  return (values) => {
    const parsed = schema.safeParse(values)
    if (parsed.success) {
      return { values: parsed.data, errors: {} }
    }

    const collected: Record<string, { type: string; message: string }> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.')
      // 필드마다 첫 오류만 보여준다. 한 필드에 세 줄이 쌓이면 읽지 않는다.
      if (key !== '' && collected[key] === undefined) {
        collected[key] = { type: issue.code, message: issue.message }
      }
    }

    return {
      values: {},
      // FieldErrors<T> 는 깊은 매핑 타입이라 구조적으로 맞출 수 없다.
      // 라이브러리 경계에서 한 번만 좁힌다.
      errors: collected as unknown as FieldErrors<TValues>,
    }
  }
}
