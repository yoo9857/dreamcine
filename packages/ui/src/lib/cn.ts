/**
 * 조건부 클래스 합성. `clsx` 를 쓰지 않는 이유는 03_TECH_STACK.md 허용 목록에
 * 없기 때문이며, 필요한 기능이 이 정도라 의존성을 늘릴 이유가 없다.
 */
export function cn(
  ...values: readonly (string | false | null | undefined)[]
): string {
  return values.filter((value): value is string => Boolean(value)).join(' ')
}
