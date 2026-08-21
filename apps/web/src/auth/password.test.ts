import { describe, it } from 'vitest'

describe('password', () => {
  it.todo('argon2id 파라미터로 해시하고 같은 평문을 검증한다')
  it.todo('다른 평문은 검증에 실패한다')
  it.todo('해시가 null 이면 더미 해시로 검증해 false 를 반환한다')
  it.todo('손상된 해시 형식은 E_INTERNAL 로 변환된다')
  it.todo('존재하는 계정과 없는 계정의 검증 시간이 허용 편차 안이다')
})
