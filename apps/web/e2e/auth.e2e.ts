import { randomUUID } from 'node:crypto'

import { disconnectDb, findVerificationTokensFor } from '@aidream/db'
import { expect, test } from '@playwright/test'

import { VERIFY_TOKEN_PREFIX } from '../src/services/auth/signup'

interface Account {
  email: string
  handle: string
  displayName: string
  password: string
}

/** 테스트마다 독립 계정을 만든다. 계정을 공유하면 순서 의존이 생긴다. */
function account(): Account {
  const id = randomUUID().replaceAll('-', '').slice(0, 10)
  return {
    email: `e2e_${id}@example.com`,
    handle: `e2e_${id}`,
    displayName: 'E2E 제작자',
    password: 'correct horse battery',
  }
}

async function fillSignup(
  page: import('@playwright/test').Page,
  user: Account,
): Promise<void> {
  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="handle"]', user.handle)
  await page.fill('input[name="displayName"]', user.displayName)
  await page.fill('input[name="password"]', user.password)
}

test.afterAll(async () => {
  await disconnectDb()
})

// US-01: 가입 → 인증메일 토큰 → 이메일 인증 → 로그인
test('US-01 가입한 사용자가 이메일을 인증하고 로그인한다', async ({ page }) => {
  const user = account()

  await page.goto('/signup')
  await fillSignup(page, user)
  await page.click('button[type="submit"]')
  await expect(page.getByTestId('signup-sent')).toBeVisible()

  // 메일 전송은 SMTP 가 없으면 건너뛴다. 토큰은 DB 에서 읽는다.
  const tokens = await findVerificationTokensFor(
    `${VERIFY_TOKEN_PREFIX}${user.email}`,
  )
  expect(tokens).toHaveLength(1)
  const token = tokens[0]?.token ?? ''
  expect(token.length).toBeGreaterThan(0)

  await page.goto(`/verify?token=${encodeURIComponent(token)}`)
  await expect(page.getByTestId('verify-success')).toBeVisible()

  await page.goto('/login')
  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)
  await page.click('button[type="submit"]')

  // 로그인이 성공하면 DB 세션 쿠키가 생기고 /api/me 가 200 을 준다.
  await expect
    .poll(async () => (await page.request.get('/api/me')).status(), {
      timeout: 15_000,
    })
    .toBe(200)

  const me = (await (await page.request.get('/api/me')).json()) as {
    handle: string
    email: string
    emailVerified: string | null
  }
  expect(me.handle).toBe(user.handle)
  expect(me.email).toBe(user.email)
  expect(me.emailVerified).not.toBeNull()
})

test('인증되지 않은 토큰으로는 로그인할 수 없다', async ({ page }) => {
  const user = account()

  await page.goto('/signup')
  await fillSignup(page, user)
  await page.click('button[type="submit"]')
  await expect(page.getByTestId('signup-sent')).toBeVisible()

  await page.goto('/login')
  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', 'wrong password value')
  await page.click('button[type="submit"]')

  await expect(page.getByTestId('login-error')).toBeVisible()
  expect((await page.request.get('/api/me')).status()).toBe(401)
})

test('만료·무효 토큰은 재발송 안내를 보여준다', async ({ page }) => {
  await page.goto('/verify?token=definitely-not-a-real-token')

  await expect(page.getByTestId('verify-error')).toBeVisible()
})

test('CSP 의 script-src 에 unsafe-inline / unsafe-eval 이 없다', async ({
  page,
}) => {
  const response = await page.goto('/login')
  const csp = response?.headers()['content-security-policy'] ?? ''
  expect(csp.length).toBeGreaterThan(0)

  const directives = csp.split(';').map((part) => part.trim())
  const scriptSrc = directives.find((part) => part.startsWith('script-src'))
  expect(scriptSrc).toBeDefined()
  expect(scriptSrc).not.toContain('unsafe-inline')
  expect(scriptSrc).not.toContain('unsafe-eval')
  expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/u)

  expect(directives).toContain("frame-ancestors 'none'")
  expect(directives).toContain("base-uri 'self'")
  expect(directives).toContain("form-action 'self'")
})

test('보안 헤더가 모두 붙는다', async ({ page }) => {
  const response = await page.goto('/login')
  const headers = response?.headers() ?? {}

  expect(headers['strict-transport-security']).toContain('max-age=63072000')
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('DENY')
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin')
  expect(headers['permissions-policy']).toContain('camera=()')
  expect(headers['cross-origin-opener-policy']).toBe('same-origin')
})

test('미인증 사용자는 스튜디오에서 로그인으로 리다이렉트된다', async ({
  page,
}) => {
  await page.goto('/studio')

  await expect(page).toHaveURL(/\/login\?next=%2Fstudio/u)
})

test('API 응답에 X-Request-Id 가 있고 no-store 다', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  expect(response.headers()['x-request-id']).toHaveLength(26)
  expect(response.headers()['cache-control']).toBe('no-store')
})
