/**
 * 공지사항.
 *
 * 아직 관리 화면이 없어 여기서 직접 더한다. 최신 공지를 맨 위에 둔다.
 * `id` 는 주소(`/notices#id`)에 쓰이므로 바꾸지 않는다.
 */
export interface Notice {
  readonly id: string
  readonly title: string
  /** YYYY-MM-DD */
  readonly date: string
  readonly category: '공지' | '업데이트' | '점검' | '이벤트'
  readonly pinned?: boolean
  /** 문단마다 한 줄. */
  readonly body: readonly string[]
}

export const NOTICES: readonly Notice[] = []
