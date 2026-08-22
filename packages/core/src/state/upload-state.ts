import type { UploadStatus } from '../enums.js'

/**
 * 업로드 세션의 상태 전이 판정. (04_DOMAIN_MODEL.md `UploadSession`)
 *
 * ```
 *   CREATED ──▶ UPLOADING ──▶ UPLOADED   (끝)
 *      │            │
 *      └────────────┴──▶ ABORTED | FAILED   (끝)
 * ```
 *
 * 판정을 순수 함수로 떼어 두는 이유: 전이 규칙이 서비스 코드 안에 흩어지면
 * "이 상태에서 저 상태로 갈 수 있나" 를 물을 곳이 없어진다. 그러면 각
 * 유스케이스가 자기 나름의 조건문을 갖게 되고, 하나만 고쳐지는 날이 온다.
 */

/** 더 이상 나갈 곳이 없는 상태. */
export const TERMINAL_UPLOAD_STATUS = [
  'UPLOADED',
  'FAILED',
  'ABORTED',
] as const satisfies readonly UploadStatus[]

export type TerminalUploadStatus = (typeof TERMINAL_UPLOAD_STATUS)[number]

export function isTerminalUploadStatus(
  status: UploadStatus,
): status is TerminalUploadStatus {
  return (TERMINAL_UPLOAD_STATUS as readonly UploadStatus[]).includes(status)
}

/**
 * 갈 수 있는 곳의 표. 표로 두는 이유는 조건문이 흩어지지 않게 하려는 것이다.
 * 끝난 상태에서 나가는 화살표는 없다.
 */
const ALLOWED: Readonly<Record<UploadStatus, readonly UploadStatus[]>> = {
  CREATED: ['UPLOADING', 'ABORTED', 'FAILED'],
  UPLOADING: ['UPLOADED', 'ABORTED', 'FAILED'],
  UPLOADED: [],
  FAILED: [],
  ABORTED: [],
}

/**
 * `from` 에서 `to` 로 갈 수 있는가.
 *
 * 같은 상태로의 전이(`UPLOADED` → `UPLOADED`)는 **허용하지 않는다.** 멱등
 * 처리는 "전이가 가능하다" 가 아니라 "이미 도착해 있다" 로 판정해야 한다.
 * 둘을 섞으면 두 번째 완료가 새 자산을 만든다. (T05 §5 멱등성)
 */
export function canTransitionUpload(
  from: UploadStatus,
  to: UploadStatus,
): boolean {
  return ALLOWED[from].includes(to)
}

/**
 * 완료 요청을 받았을 때 무엇을 해야 하는가.
 *
 * 상태마다 답이 다르고 그 차이가 사용자에게 그대로 드러난다 —
 * 이미 끝난 것은 같은 결과를 돌려주고(200), 중단된 것은 새로 시작하라고
 * 말한다(409). 이 분기를 유스케이스 안에 두면 라우트마다 조금씩 달라진다.
 */
export type CompleteDecision =
  /** 정상 경로. S3 완료를 진행한다. */
  | { readonly kind: 'proceed' }
  /** 이미 끝났다. 저장된 자산을 그대로 돌려준다. (멱등) */
  | { readonly kind: 'already-completed' }
  /** 되돌릴 수 없는 상태. 에러코드가 사용자에게 다음 행동을 알려준다. */
  | { readonly kind: 'rejected'; readonly code: 'ABORTED' | 'FAILED' }

export function decideComplete(status: UploadStatus): CompleteDecision {
  switch (status) {
    case 'CREATED':
    case 'UPLOADING':
      return { kind: 'proceed' }
    case 'UPLOADED':
      return { kind: 'already-completed' }
    case 'ABORTED':
      return { kind: 'rejected', code: 'ABORTED' }
    case 'FAILED':
      return { kind: 'rejected', code: 'FAILED' }
  }
}
