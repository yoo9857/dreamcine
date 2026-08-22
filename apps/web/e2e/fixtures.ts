import { test as base } from '@playwright/test'

/**
 * 앱은 레이트리밋 신원으로 `X-Forwarded-For` 의 첫 값을 쓴다.
 * (07_AUTH_SECURITY.md §8 — 계약이다.)
 *
 * E2E 는 전부 같은 호스트에서 오므로 신원이 하나로 뭉친다. 그러면
 * `/api/auth/*` 의 10회/10분 한도를 스위트 전체가 나눠 쓰게 되고, 재시도가
 * 한 번만 걸려도 한도를 넘겨 **관계없는 테스트가 429 로 무너진다.** 실제로
 * 그렇게 무너졌다 — 진짜 원인(로그인 불능)이 가입 실패로 위장돼 보였다.
 *
 * 테스트마다 다른 IP 를 주어 "서로 다른 사용자" 를 정직하게 흉내낸다.
 * 프로덕션에서는 Caddy 가 XFF 를 덮어쓰므로 클라이언트가 이 값을 위조할 수
 * 없다 (OBS-006). 한도 자체는 전용 테스트가 따로 검증한다.
 */
function testIp(testId: string): string {
  let hash = 0
  for (const character of testId) {
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) % 0xff_ff_ff
  }
  const second = (hash >> 16) & 0xff
  const third = (hash >> 8) & 0xff
  const fourth = hash & 0xff
  // 10.0.0.0/8 사설 대역. 실제 트래픽과 섞일 수 없다.
  return `10.${String(second)}.${String(third)}.${String(fourth || 1)}`
}

/** 레이트리밋 한도 자체를 검증하는 테스트가 쓰는 전용 IP. */
export const RATE_LIMIT_TEST_IP = '10.255.255.254'

export const test = base.extend({
  extraHTTPHeaders: async (_fixtures, use, testInfo) => {
    await use({ 'x-forwarded-for': testIp(testInfo.testId) })
  },
})

export { expect } from '@playwright/test'
