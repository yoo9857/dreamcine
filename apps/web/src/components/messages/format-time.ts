/** 메시지 화면의 시각 표기. 서울 기준으로 고정한다 — 서버 렌더와 브라우저가 같은 글자를 내야 한다. */

const ZONE = 'Asia/Seoul'

const TIME = new Intl.DateTimeFormat('ko-KR', {
  hour: 'numeric',
  minute: '2-digit',
  timeZone: ZONE,
})
const MONTH_DAY = new Intl.DateTimeFormat('ko-KR', {
  month: 'long',
  day: 'numeric',
  timeZone: ZONE,
})
const FULL_DAY = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
  timeZone: ZONE,
})
const DAY_KEY = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: ZONE,
})

export function dayKey(iso: string): string {
  return DAY_KEY.format(new Date(iso))
}

/** 목록용: 오늘이면 시각, 어제면 "어제", 올해면 월·일, 그 밖엔 연도까지. */
export function listTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const today = DAY_KEY.format(now)
  const key = DAY_KEY.format(date)
  if (key === today) return TIME.format(date)
  const yesterday = DAY_KEY.format(new Date(now.getTime() - 86_400_000))
  if (key === yesterday) return '어제'
  if (key.slice(0, 4) === today.slice(0, 4)) return MONTH_DAY.format(date)
  return key.replaceAll('-', '. ')
}

export function messageTime(iso: string): string {
  return TIME.format(new Date(iso))
}

export function dayLabel(iso: string): string {
  return FULL_DAY.format(new Date(iso))
}
