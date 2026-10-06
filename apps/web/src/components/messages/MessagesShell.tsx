import type { ReactNode } from 'react'

/**
 * 메시지함 2단 화면. 넓은 화면은 목록과 대화를 나란히, 좁은 화면은 하나씩
 * 보여준다 — 대화가 열려 있으면(`paneOpen`) 목록을 숨기고 대화만 띄운다.
 */
export function MessagesShell({
  list,
  pane,
  paneOpen,
}: {
  readonly list: ReactNode
  readonly pane: ReactNode
  readonly paneOpen: boolean
}): ReactNode {
  return (
    <div className="dm-page" data-pane={paneOpen ? 'open' : 'closed'}>
      <aside className="dm-sidebar" aria-labelledby="dm-title">
        <header className="dm-sidebar-head">
          <h1 id="dm-title">메시지</h1>
        </header>
        <div className="dm-sidebar-body">{list}</div>
      </aside>
      <div className="dm-pane">{pane}</div>
    </div>
  )
}

export function MessagesEmptyPane(): ReactNode {
  return (
    <div className="dm-empty-pane">
      <strong>대화를 골라 주세요</strong>
      <p>
        왼쪽에서 대화를 열거나, 작가 페이지의 “메시지” 버튼으로 새 대화를 시작할
        수 있어요.
      </p>
    </div>
  )
}
