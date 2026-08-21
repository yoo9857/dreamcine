import type { Capacity, ErrorCode } from '@aidream/core'
import { LIMITS } from '@aidream/core'

/**
 * 티어 의존 숫자가 들어가는 문구는 반드시 함수형으로 둔다. 문자열에 용량을
 * 박으면 T1 승급 시 문구가 거짓이 된다. (09_ERROR_CATALOG.md §5)
 */
export type MessageEntry = string | ((capacity: Capacity) => string)

function fmtBytes(bytes: number): string {
  const gib = bytes / 1024 ** 3
  const mib = bytes / 1024 ** 2
  if (gib >= 1) {
    return `${Number.isInteger(gib) ? String(gib) : gib.toFixed(1)}GB`
  }
  return `${String(Math.round(mib))}MB`
}

function fmtMinutes(seconds: number): string {
  return `${String(Math.round(seconds / 60))}분`
}

/**
 * 타입이 `Record<ErrorCode, MessageEntry>` 이므로 카탈로그에 코드를 추가하면
 * 문구 누락이 **컴파일 에러**가 된다. 클라이언트 전용 코드도 포함한다.
 */
export const MESSAGES: Record<ErrorCode, MessageEntry> = {
  // 인증 · 권한
  E_AUTH_REQUIRED: '로그인이 필요합니다.',
  E_AUTH_INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  E_AUTH_EMAIL_NOT_VERIFIED:
    '이메일 인증을 완료해야 사용할 수 있습니다. 인증 메일을 다시 받아보세요.',
  E_AUTH_SESSION_EXPIRED: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
  E_AUTH_ACCOUNT_SUSPENDED: '이용이 정지된 계정입니다.',
  E_AUTH_OAUTH_FAILED:
    '소셜 로그인 공급자에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  E_PERM_DENIED: '권한이 없습니다.',
  E_PERM_NOT_OWNER: '본인이 만든 항목만 변경할 수 있습니다.',
  E_PERM_AGE_RESTRICTED: '연령 등급 제한으로 볼 수 없는 작품입니다.',

  // 사용자
  E_USER_NOT_FOUND: '사용자를 찾을 수 없습니다.',
  E_USER_HANDLE_TAKEN: '이미 사용 중이거나 사용할 수 없는 아이디입니다.',
  E_USER_EMAIL_TAKEN: '이미 가입된 이메일입니다.',
  E_USER_SELF_ACTION: '자기 자신에게는 할 수 없는 동작입니다.',

  // 시리즈 · 에피소드
  E_SERIES_NOT_FOUND: '시리즈를 찾을 수 없습니다.',
  E_SERIES_LIMIT_EXCEEDED: `만들 수 있는 시리즈 수(${String(LIMITS.SERIES_PER_USER)}개)를 초과했습니다.`,
  E_EPISODE_NOT_FOUND: '에피소드를 찾을 수 없습니다.',
  E_EPISODE_NOT_PUBLISHED: '에피소드를 찾을 수 없습니다.',
  E_EPISODE_INVALID_TRANSITION: '현재 상태에서는 할 수 없는 변경입니다.',
  E_EPISODE_ASSET_NOT_READY:
    '영상 변환이 끝나지 않았습니다. 변환 완료 후 공개할 수 있습니다.',
  E_EPISODE_AI_DISCLOSURE_REQUIRED:
    'AI 제작 표기는 필수입니다. 사용한 도구와 모델을 적어주세요.',
  E_EPISODE_NUMBER_DUPLICATE: '같은 시즌에 이미 존재하는 화수입니다.',
  E_EPISODE_SCHEDULE_IN_PAST: '공개 예약 시각은 현재보다 뒤여야 합니다.',

  // 업로드
  E_UPLOAD_SESSION_NOT_FOUND: '업로드 정보를 찾을 수 없습니다.',
  E_UPLOAD_SESSION_EXPIRED: `업로드 유효 시간(${String(LIMITS.UPLOAD_SESSION_TTL_H)}시간)이 지났습니다. 처음부터 다시 올려주세요.`,
  E_UPLOAD_TOO_LARGE: (capacity) =>
    `업로드 가능한 최대 용량(${fmtBytes(capacity.uploadMaxBytes)})을 초과했습니다.`,
  E_UPLOAD_UNSUPPORTED_TYPE:
    '지원하지 않는 영상 형식입니다. MP4, MOV, MKV, WebM 을 사용해 주세요.',
  E_UPLOAD_INVALID_PART: '업로드 조각 정보가 올바르지 않습니다.',
  E_UPLOAD_PART_MISSING: '업로드되지 않은 조각이 있습니다. 이어서 올려주세요.',
  E_UPLOAD_ALREADY_COMPLETED: '이미 완료된 업로드입니다.',
  E_UPLOAD_ABORTED: '중단된 업로드입니다. 새로 시작해 주세요.',
  E_UPLOAD_QUOTA_EXCEEDED: (capacity) =>
    `하루 업로드 한도(${fmtBytes(capacity.uploadDailyBytes)})를 초과했습니다.`,

  // 자산 · 미디어 처리
  E_ASSET_NOT_FOUND: '영상 정보를 찾을 수 없습니다.',
  E_ASSET_NOT_READY: '영상 변환이 진행 중입니다. 잠시 후 다시 시도해 주세요.',
  E_MEDIA_PROBE_FAILED: '영상 파일을 읽을 수 없습니다. 파일이 손상되었습니다.',
  E_MEDIA_NO_VIDEO_STREAM: '영상 트랙이 없는 파일입니다.',
  E_MEDIA_NO_AUDIO_STREAM: '소리가 없는 영상은 올릴 수 없습니다.',
  E_MEDIA_UNSUPPORTED_CODEC: '지원하지 않는 코덱입니다.',
  E_MEDIA_RESOLUTION_TOO_LOW: `해상도가 너무 낮습니다. ${String(LIMITS.VIDEO_MIN_LONG_EDGE)}×${String(LIMITS.VIDEO_MIN_SHORT_EDGE)} 이상이어야 합니다.`,
  E_MEDIA_DURATION_TOO_LONG: (capacity) =>
    `영상이 ${fmtMinutes(capacity.videoMaxDurationSec)}을 초과했습니다.`,
  E_MEDIA_TRANSCODE_FAILED:
    '영상 변환에 실패했습니다. 다시 시도할 수 있습니다.',
  E_MEDIA_TRANSCODE_TIMEOUT: '영상 변환 시간이 초과되었습니다.',
  E_MEDIA_DISK_FULL: '서버 저장 공간이 부족합니다. 잠시 후 다시 시도해 주세요.',

  // 피드 · 소셜
  E_FEED_INVALID_CURSOR: '목록 정보가 만료되었습니다. 새로고침해 주세요.',
  E_SOCIAL_ALREADY_FOLLOWING: '이미 팔로우한 크리에이터입니다.',
  E_SOCIAL_NOT_FOLLOWING: '팔로우하지 않은 크리에이터입니다.',
  E_SOCIAL_BLOCKED: '차단된 관계입니다.',
  E_COMMENT_NOT_FOUND: '댓글을 찾을 수 없습니다.',
  E_COMMENT_TOO_LONG: `댓글은 ${String(LIMITS.COMMENT_MAX_LEN)}자까지 쓸 수 있습니다.`,
  E_COMMENT_DEPTH_EXCEEDED: '답글은 한 단계까지만 달 수 있습니다.',
  E_COMMENT_DISABLED: '이 작품은 댓글이 닫혀 있습니다.',

  // 신고 · 심사
  E_REPORT_DUPLICATE: '이미 신고한 대상입니다.',
  E_REPORT_NOT_FOUND: '신고를 찾을 수 없습니다.',
  E_REPORT_ALREADY_RESOLVED: '이미 처리된 신고입니다.',

  // 레이트리밋 · 인프라 · 시스템
  E_RATE_LIMITED: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  E_STORAGE_UNAVAILABLE:
    '저장소에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  E_STORAGE_OBJECT_NOT_FOUND: '파일을 찾을 수 없습니다.',
  E_QUEUE_UNAVAILABLE:
    '작업 대기열에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  E_DB_UNAVAILABLE:
    '데이터베이스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
  E_DB_CONFLICT: '동시에 같은 변경이 일어났습니다. 다시 시도해 주세요.',
  E_VALIDATION: '입력값을 확인해 주세요.',
  E_NOT_FOUND: '요청한 항목을 찾을 수 없습니다.',
  E_INTERNAL: '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  E_NOT_IMPLEMENTED: '아직 준비되지 않은 기능입니다.',

  // 클라이언트 전용 (서버가 던지지 않음)
  E_OFFLINE: '네트워크에 연결되지 않았습니다.',
  E_PLAYER_UNSUPPORTED: '이 브라우저에서는 재생할 수 없습니다.',
  E_PLAYER_MEDIA_ERROR: '영상을 재생할 수 없습니다. 새로고침해 주세요.',
  E_PLAYER_MANIFEST_ERROR: '영상 정보를 불러오지 못했습니다.',
}

export function messageFor(code: ErrorCode, capacity: Capacity): string {
  const entry = MESSAGES[code]
  return typeof entry === 'function' ? entry(capacity) : entry
}

/**
 * 클라이언트는 티어를 모른다. 티어 의존 문구는 서버 응답의 `message` 를 그대로
 * 쓰고, 이 함수는 티어와 무관한 고정 문구만 돌려준다.
 */
export function staticMessageFor(code: ErrorCode): string {
  const entry = MESSAGES[code]
  if (typeof entry === 'string') {
    return entry
  }
  const fallback = MESSAGES.E_INTERNAL
  return typeof fallback === 'string' ? fallback : ''
}

export interface ApiErrorInfo {
  code: string
  message: string
  fields: Record<string, string> | null
}

function toFieldMap(value: unknown): Record<string, string> | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const fields: Record<string, string> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      fields[key] = entry
    }
  }
  return fields
}

/** 09_ERROR_CATALOG.md §4 형태의 응답에서 표시용 정보만 꺼낸다. */
export function readApiError(payload: unknown): ApiErrorInfo | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('error' in payload)
  ) {
    return null
  }
  const { error } = payload as { error: unknown }
  if (typeof error !== 'object' || error === null) {
    return null
  }
  const record: Record<string, unknown> = { ...error }
  const code = record.code
  const message = record.message
  if (typeof code !== 'string' || typeof message !== 'string') {
    return null
  }
  return { code, message, fields: toFieldMap(record.fields) }
}
