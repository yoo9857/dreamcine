import { describe, it } from 'vitest'

describe('auth schemas', () => {
  it.todo('이메일은 앞뒤 공백을 제거하고 소문자로 정규화한다')
  it.todo('핸들은 소문자로 정규화되고 3~20자 [a-z0-9_] 만 허용한다')
  it.todo('대문자·하이픈·공백이 든 핸들은 거부된다')
  it.todo('비밀번호는 10자 미만이면 거부된다')
  it.todo('표시이름은 제어문자와 zero-width 문자를 제거한다')
  it.todo('표시이름이 정규화 후 비면 거부된다')
  it.todo('표시이름은 40자를 넘으면 거부된다')
  it.todo('소개는 BIO_MAX_LEN 을 넘으면 거부된다')
  it.todo('프로필 수정은 모든 필드가 선택이고 null 을 허용한다')
  it.todo('RESERVED_HANDLES 는 08_UIUX 라우트 맵의 최상위 경로를 포함한다')
})
