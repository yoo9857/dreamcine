import { describe, it } from 'vitest'

describe('auth repository', () => {
  it.todo('세션을 생성하고 토큰으로 세션+사용자를 조회한다')
  it.todo('세션 만료를 갱신한다 (rolling)')
  it.todo('세션을 삭제하면 조회 결과가 null 이다')
  it.todo('사용자의 모든 세션을 삭제한다')
  it.todo('OAuth 계정을 연결하고 provider 조합으로 사용자를 찾는다')
  it.todo('같은 provider 조합을 두 번 연결하면 E_DB_CONFLICT')
  it.todo('연결을 해제하면 provider 조회 결과가 null 이다')
  it.todo('일회용 토큰은 한 번만 소비된다')
  it.todo('만료된 토큰도 소비 시 함께 제거된다')
  it.todo('emailVerified 를 설정한다')
  it.todo('비밀번호 해시를 갱신한다')
  it.todo('삭제된 사용자에게는 세션을 만들지 않는다')
})
