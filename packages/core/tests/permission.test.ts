import { describe, it } from 'vitest'

describe('can()', () => {
  it.todo('역할 × 동작 × 소유관계 전조합이 권한 매트릭스와 일치한다')
  it.todo("status='SUSPENDED' 는 모든 동작이 false")
  it.todo("status='DELETED' 는 모든 동작이 false")
  it.todo('emailVerified=false 는 업로드·댓글·신고가 false')
  it.todo('CREATOR 는 자기 소유 리소스만 수정·삭제할 수 있다')
  it.todo('MODERATOR 는 남의 콘텐츠를 숨길 수 있으나 영구삭제는 못 한다')
  it.todo('ADMIN 은 소유자가 아니어도 영구삭제·정지·역할부여가 가능하다')
  it.todo('VIEWER 는 시리즈·에피소드 생성과 업로드가 false')
  it.todo('resource 가 없으면 소유 판정이 필요한 동작은 false')
})
