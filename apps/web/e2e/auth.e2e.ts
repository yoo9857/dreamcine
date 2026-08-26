import { randomUUID } from 'node:crypto'

import { disconnectDb, findVerificationTokensFor } from '@aidream/db'
import { RATE_LIMIT_TEST_IP, expect, test } from './fixtures'

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

test('비밀번호가 틀리면 같은 문구로 거부한다', async ({ page }) => {
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

test('인라인 스크립트에 CSP nonce 가 실려 하이드레이션이 살아있다', async ({
  request,
}) => {
  // 정적 프리렌더된 페이지의 인라인 스크립트에는 nonce 가 붙지 않는다.
  // 그러면 우리 CSP 가 그것을 차단해 폼이 죽는다. 실제로 한 번 겪은 사고이므로
  // 헤더와 본문을 같은 응답에서 비교해 회귀를 막는다.
  const response = await request.get('/login')
  const csp = response.headers()['content-security-policy'] ?? ''
  const nonce = /'nonce-([A-Za-z0-9+/=]+)'/u.exec(csp)?.[1]
  expect(nonce).toBeDefined()

  const html = await response.text()
  const tagged = html.split(`nonce="${nonce ?? ''}"`).length - 1
  expect(tagged).toBeGreaterThan(0)
  // RSC 페이로드에도 실려야 클라이언트 컴포넌트가 붙는다.
  expect(html).not.toContain('nonce\\":\\"$undefined')
})

test('로그인 화면에서 CSP 위반이 발생하지 않는다', async ({ page }) => {
  const violations: string[] = []
  page.on('console', (message) => {
    const text = message.text()
    if (text.includes('Content Security Policy')) {
      violations.push(text)
    }
  })

  await page.goto('/login')
  // 하이드레이션이 끝나면 입력이 실제로 반응한다.
  await page.fill('input[name="email"]', 'hydration@example.com')
  await expect(page.locator('input[name="email"]')).toHaveValue(
    'hydration@example.com',
  )

  expect(violations).toEqual([])
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

test('테마 토글이 서버 렌더에 반영된다 (깜빡임 없음)', async ({ page }) => {
  await page.goto('/login')
  const html = page.locator('html')

  // 쿠키가 없으면 시스템 설정을 따른다 — data-theme 을 붙이지 않는다.
  await expect(html).not.toHaveAttribute('data-theme', /.+/u)

  await page.getByRole('button', { name: /바꾸기$/u }).click()
  await expect(html).toHaveAttribute('data-theme', 'light')

  // 새로고침해도 유지된다 (쿠키에 남는다).
  await page.reload()
  await expect(html).toHaveAttribute('data-theme', 'light')

  // 핵심: 테마가 **서버가 보낸 HTML** 에 이미 들어있다. 하이드레이션 뒤에
  // 클래스를 붙이는 방식이면 첫 페인트에 깜빡임이 생긴다. (OBS-005)
  // `page.request` 로 읽으면 안 된다. 테마 쿠키는 프로덕션 빌드에서 `Secure`
  // 가 붙는데, 브라우저는 localhost 예외로 http 에서도 이를 보내지만
  // Playwright 의 APIRequestContext 는 규칙대로 보내지 않는다. 그래서 쿠키가
  // 있는데도 서버가 못 받아 이 단정만 실패했다. 우리가 보고 싶은 것은
  // "서버가 보낸 HTML" 이므로 실제 탐색의 응답 본문을 읽는다.
  const response = await page.goto('/login')
  expect(await (response?.text() ?? Promise.resolve(''))).toContain(
    'data-theme="light"',
  )
})

test('키보드만으로 로그인을 완주한다', async ({ page }) => {
  const user = account()

  await page.goto('/signup')
  await fillSignup(page, user)
  await page.click('button[type="submit"]')
  await expect(page.getByTestId('signup-sent')).toBeVisible()

  const tokens = await findVerificationTokensFor(
    `${VERIFY_TOKEN_PREFIX}${user.email}`,
  )
  await page.goto(`/verify?token=${encodeURIComponent(tokens[0]?.token ?? '')}`)
  await expect(page.getByTestId('verify-success')).toBeVisible()

  // 10_NFR §10 — 모든 기능을 키보드만으로 조작할 수 있어야 한다.
  await page.goto('/login')
  const emailField = page.locator('input[name="email"]')
  for (let step = 0; step < 10; step += 1) {
    if (await emailField.evaluate((node) => node === document.activeElement)) {
      break
    }
    await page.keyboard.press('Tab')
  }
  await expect(emailField).toBeFocused()

  await page.keyboard.type(user.email)
  await page.keyboard.press('Tab')
  await expect(page.locator('input[name="password"]')).toBeFocused()
  await page.keyboard.type(user.password)
  await page.keyboard.press('Enter')

  await expect
    .poll(async () => (await page.request.get('/api/me')).status(), {
      timeout: 15_000,
    })
    .toBe(200)
})

test('입력 오류가 해당 입력에 연결되어 읽힌다', async ({ page }) => {
  await page.goto('/signup')
  await page.fill('input[name="email"]', 'not-an-email')
  await page.fill('input[name="handle"]', 'ab')
  await page.fill('input[name="displayName"]', '이름')
  await page.fill('input[name="password"]', 'short')
  await page.click('button[type="submit"]')

  // 08_UIUX §10 — 어디를 고쳐야 하는지 알 수 있어야 한다.
  const email = page.locator('input[name="email"]')
  await expect(email).toHaveAttribute('aria-invalid', 'true')
  const describedBy = await email.getAttribute('aria-describedby')
  expect(describedBy).toBeTruthy()
  await expect(page.locator(`#${describedBy ?? ''}`)).toBeVisible()
})

test('API 응답에 X-Request-Id 가 있고 no-store 다', async ({ request }) => {
  const response = await request.get('/api/health')

  expect(response.status()).toBe(200)
  expect(response.headers()['x-request-id']).toHaveLength(26)
  expect(response.headers()['cache-control']).toBe('no-store')
})

test('인증 API 는 IP 당 10회/10분을 넘기면 429 를 준다', async ({
  request,
  baseURL,
}) => {
  // 05_API_CONTRACT.md §10 — `POST /api/auth/*` 는 10회/10분, 키는 IP.
  //
  // 이 테스트만 쓰는 IP 를 준다. 다른 테스트의 예산을 건드리지 않고, 반대로
  // 다른 테스트 때문에 한도가 미리 소진되지도 않는다.
  const headers = {
    'x-forwarded-for': RATE_LIMIT_TEST_IP,
    origin: baseURL ?? '',
  }
  // 본문은 일부러 무효로 둔다. 레이트리밋은 본문 파싱보다 앞에서 판정되므로
  // 계정을 만들지 않고도 한도만 정확히 소진할 수 있다.
  //
  // "처음 10번은 통과한다" 는 단정하지 않는다. 이 테스트가 재시도되면 한도가
  // 이미 소진된 상태로 다시 들어와 반드시 실패하기 때문이다. E2E 가 확인할
  // 것은 한도가 **실제 라우트에 연결되어 있다**는 것과 거부 응답의 모양이다.
  // 정확한 계수는 handler 단위 테스트가 맡는다.
  let limitedAt = 0
  for (let count = 1; count <= 11 && limitedAt === 0; count += 1) {
    const response = await request.post('/api/auth/signup', {
      headers,
      data: {},
    })
    if (response.status() !== 429) {
      continue
    }
    limitedAt = count
    expect(Number(response.headers()['retry-after'])).toBeGreaterThan(0)
    const body = (await response.json()) as { error: { code: string } }
    expect(body.error.code).toBe('E_RATE_LIMITED')
  }

  expect(limitedAt).toBeGreaterThan(0)
})

test('로그아웃하면 훔친 쿠키로도 다시 들어올 수 없다', async ({
  page,
  baseURL,
}) => {
  const user = account()

  await page.goto('/signup')
  await fillSignup(page, user)
  await page.click('button[type="submit"]')
  await expect(page.getByTestId('signup-sent')).toBeVisible()

  const tokens = await findVerificationTokensFor(
    `${VERIFY_TOKEN_PREFIX}${user.email}`,
  )
  await page.goto(`/verify?token=${encodeURIComponent(tokens[0]?.token ?? '')}`)
  await expect(page.getByTestId('verify-success')).toBeVisible()

  await page.goto('/login')
  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)
  await page.click('button[type="submit"]')
  await expect
    .poll(async () => (await page.request.get('/api/me')).status(), {
      timeout: 15_000,
    })
    .toBe(200)

  // 쿠키를 미리 챙겨둔다 — "이미 새어나간 세션" 을 흉내내기 위해서다.
  const stolen = (await page.context().cookies()).filter((cookie) =>
    cookie.name.endsWith('authjs.session-token'),
  )
  expect(stolen.length).toBeGreaterThan(0)

  const csrf = (await (await page.request.get('/api/auth/csrf')).json()) as {
    csrfToken: string
  }
  const signedOut = await page.request.post('/api/auth/signout', {
    form: { csrfToken: csrf.csrfToken, callbackUrl: '/login' },
    headers: { origin: baseURL ?? '' },
  })
  expect(signedOut.status()).toBeLessThan(400)
  expect((await page.request.get('/api/me')).status()).toBe(401)

  // 핵심: 쿠키를 되돌려 놓아도 들어올 수 없어야 한다. 쿠키만 지우고 DB 세션
  // 행을 남기면 여기서 200 이 나온다 — 로그아웃이 취소를 못 한 것이다.
  // (ISS-007)
  await page.context().addCookies(stolen)
  expect((await page.request.get('/api/me')).status()).toBe(401)
})

test('홈이 열리고 로그인·가입으로 들어갈 수 있다', async ({ page }) => {
  // 배포하면 방문자가 보는 첫 화면이다. 404 로 돌아가는 회귀를 막는다.
  // T09 이후 홈은 공개 인기 피드이며 비회원 진입 링크도 함께 제공한다.
  const response = await page.goto('/')
  expect(response?.status()).toBe(200)

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: /이야기가 시작되고,.*취향이 연결되는 곳/u,
    }),
  ).toBeVisible()
  const guestHeader = page.locator('.guest-header')
  await expect(
    guestHeader.getByRole('link', { name: '무료로 시작하기' }),
  ).toBeVisible()

  await guestHeader.getByRole('link', { name: '로그인' }).click()
  await expect(page).toHaveURL(/\/login$/u)
})

test('미인증 사용자는 browse 홈에서 로그인으로 이동한다', async ({ page }) => {
  await page.goto('/browse')

  await expect(page).toHaveURL(/\/login\?next=%2Fbrowse$/u)
})

test('로그인 성공 후 browse 홈으로 이동한다', async ({ page }) => {
  const user = account()

  await page.goto('/signup')
  await fillSignup(page, user)
  await page.click('button[type="submit"]')
  await expect(page.getByTestId('signup-sent')).toBeVisible()

  const tokens = await findVerificationTokensFor(
    `${VERIFY_TOKEN_PREFIX}${user.email}`,
  )
  await page.goto(`/verify?token=${encodeURIComponent(tokens[0]?.token ?? '')}`)
  await expect(page.getByTestId('verify-success')).toBeVisible()

  await page.goto('/login')
  await page.fill('input[name="email"]', user.email)
  await page.fill('input[name="password"]', user.password)
  await page.click('button[type="submit"]')

  // 로그인 전 랜딩(`/`)과 인증 홈(`/browse`)을 분리한다.
  await expect(page).toHaveURL(/\/browse$/u)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.locator('.browse-account-trigger').click()
  await expect(page.getByRole('menu', { name: '계정 바로가기' })).toBeVisible()
  await expect(
    page.getByRole('menuitem', { name: /프로필 관리/u }),
  ).toHaveAttribute('href', '/account#profile')
  await expect(page.getByRole('menuitem', { name: /^계정/u })).toHaveAttribute(
    'href',
    '/account#account',
  )

  await page.getByRole('menuitem', { name: /^계정/u }).click()
  await expect(page).toHaveURL(/\/account#account$/u)
  await expect(
    page.getByRole('heading', { level: 1, name: '내 계정, 한눈에.' }),
  ).toBeVisible()

  await page.goto('/')
  await expect(page).toHaveURL(/\/browse$/u)
})
