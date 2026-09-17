import type { FeedItem } from '../entities.js'

/**
 * 세로 영상 판정 기준. 1 미만이면 세로(숏폼 화면비)다. 1:1 정사각은
 * 롱폼 그리드가 더 자연스러우므로 숏폼으로 보지 않는다.
 */
const PORTRAIT_MAX_RATIO = 1

/** 원본 가로·세로 픽셀에서 화면비를 구한다. 값이 없으면 null 이다. */
export function aspectRatioOf(
  width: number | null | undefined,
  height: number | null | undefined,
): number | null {
  if (typeof width !== 'number' || typeof height !== 'number') return null
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  if (width <= 0 || height <= 0) return null
  return width / height
}

/**
 * 작품 형식 판정.
 *
 * 1. 업로더가 SHORT_FORM 을 고른 작품은 그대로 숏폼이다.
 * 2. 형식을 고르지 않은 작품은 workType 이 SERIES 로 기본 저장되어 숏폼을
 *    구분할 수 없다. 이때는 원본 영상 비율을 읽어 세로 영상이면 숏폼으로
 *    본다.
 *
 * 재생시간은 쓰지 않는다. 짧은 롱폼 작품이 숏폼으로 잘못 노출되던 원인이다.
 */
export function isShortFormWork(
  item: Pick<FeedItem, 'series' | 'aspectRatio'>,
): boolean {
  if (item.series.workType === 'SHORT_FORM') return true
  const ratio = item.aspectRatio ?? null
  return ratio !== null && ratio < PORTRAIT_MAX_RATIO
}
