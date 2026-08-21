import { describe, it } from 'vitest'

describe('withRoute', () => {
  it.todo("auth:'required' 인데 세션이 없으면 401 E_AUTH_REQUIRED")
  it.todo("auth:'required' 이고 세션이 있으면 ctx.session 이 non-null")
  it.todo('정지 계정은 403 E_AUTH_ACCOUNT_SUSPENDED')
  it.todo('AppError 는 status-map 의 상태코드로 변환된다')
  it.todo('ZodError 는 422 E_VALIDATION + fields 로 변환된다')
  it.todo('미분류 예외는 500 E_INTERNAL 이고 응답에 스택이 없다')
  it.todo('NotImplementedError 는 501 로 변환된다')
  it.todo('Origin 불일치 POST 는 403 E_PERM_DENIED')
  it.todo('모든 응답에 X-Request-Id 헤더가 있다')
  it.todo('BigInt 는 문자열로 직렬화된다')
  it.todo('body 가 JSON 이 아니면 422 E_VALIDATION')
})
