import { describe, it } from 'vitest'

describe('auth use cases', () => {
  it.todo('가입 → 인증메일 토큰 → 인증 → emailVerified 설정')
  it.todo('예약어 핸들은 E_USER_HANDLE_TAKEN')
  it.todo('중복 이메일은 E_USER_EMAIL_TAKEN')
  it.todo('중복 핸들은 E_USER_HANDLE_TAKEN')
  it.todo('메일 발송이 실패해도 가입은 성공한다')
  it.todo('만료된 인증 토큰은 E_VALIDATION')
  it.todo('인증 토큰은 1회만 소비된다')
  it.todo('없는 계정의 재설정 요청도 성공으로 끝난다')
  it.todo('재설정 토큰으로 비밀번호를 바꾸면 기존 세션이 무효화된다')
  it.todo('정지 계정은 즉시 접근이 차단된다')
})
