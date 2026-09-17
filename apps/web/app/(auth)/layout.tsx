import type { ReactNode } from 'react'

/**
 * 인증 화면의 스타일 경계.
 *
 * `auth-login.css` 는 로그인·가입·인증·비밀번호·탈퇴 취소 화면에서만 쓰인다.
 * 루트 레이아웃에 두면 그 화면을 거치지 않는 방문자도 875줄을 내려받는다.
 * 레이아웃 자체는 통과 지점일 뿐이고, 권한 판정은 미들웨어와 각 화면이 한다.
 */
import '@/src/styles/auth-login.css'

export default function AuthLayout({
  children,
}: {
  readonly children: ReactNode
}): ReactNode {
  return children
}
