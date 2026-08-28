import type { ReactNode } from 'react'

import { requireCapability } from '@/src/auth/server-session'
import { StudioShell } from '@/src/components/studio/StudioShell'

/**
 * 스튜디오 전 화면의 권한 경계.
 *
 * 미들웨어는 쿠키 유무만 보고 리다이렉트한다 — 08_UIUX_SPEC.md §1 이 그것을
 * "UX 용 기준이며 보안 경계가 아니다" 라고 못박고 있다. 역할·정지·이메일 인증
 * 판정은 세션을 실제로 읽는 여기서 한다.
 *
 * 레이아웃에 두는 이유: 화면마다 확인하게 하면 새 화면이 추가될 때 빠뜨린다.
 * 경계는 들어오는 길목에 하나만 있어야 한다.
 */
export default async function StudioLayout({
  children,
}: {
  readonly children: ReactNode
}): Promise<ReactNode> {
  const session = await requireCapability('upload.create', '/studio')

  return (
    <StudioShell
      displayName={session.user.displayName}
      handle={session.user.handle}
    >
      {children}
    </StudioShell>
  )
}
