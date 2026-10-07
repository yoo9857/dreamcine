const ACTIONS: Readonly<Record<string, string>> = {
  WARNING: '운영진 경고가 등록되었습니다.',
  WARN_USER: '신고 검토 후 운영진 경고가 등록되었습니다.',
  SUSPENDED: '계정 이용이 정지되었습니다.',
  SUSPEND_USER: '신고 검토 후 계정 이용이 정지되었습니다.',
  ACTIVE: '계정 정지가 해제되었습니다.',
  HIDE_CONTENT: '신고 검토 후 콘텐츠가 숨겨졌습니다.',
  REMOVE_CONTENT: '신고 검토 후 콘텐츠가 삭제되었습니다.',
  REJECT: '콘텐츠에 대한 신고가 기각되었습니다.',
}

export function moderationNotificationLabel(payload: unknown): string {
  if (typeof payload !== 'object' || payload === null)
    return '콘텐츠 심사 결과가 도착했습니다.'
  const fields = payload as Record<string, unknown>
  const action = typeof fields.action === 'string' ? fields.action : ''
  const reason =
    typeof fields.reason === 'string' && fields.reason !== ''
      ? ` 사유: ${fields.reason}`
      : ''
  const suspended = action === 'SUSPENDED' || action === 'SUSPEND_USER'
  const expires =
    typeof fields.expiresAt === 'string' ? new Date(fields.expiresAt) : null
  const duration = suspended
    ? expires !== null && Number.isFinite(expires.getTime())
      ? ` 해제 예정: ${expires.toLocaleString('ko-KR')}.`
      : ' 영구 정지.'
    : ''
  return (
    (ACTIONS[action] ?? '콘텐츠 심사 결과가 도착했습니다.') + duration + reason
  )
}
