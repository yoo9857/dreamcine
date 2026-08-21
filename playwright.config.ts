import { defineConfig } from '@playwright/test'

const baseURL = process.env.APP_URL ?? 'http://127.0.0.1:3000'

export default defineConfig({
  testDir: './apps/web/e2e',
  testMatch: '**/*.e2e.ts',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  // 외부에서 이미 띄운 서버를 쓰려면 PLAYWRIGHT_SKIP_WEB_SERVER=1 을 준다.
  ...(process.env.PLAYWRIGHT_SKIP_WEB_SERVER === '1'
    ? {}
    : {
        webServer: {
          // dev 서버는 React Refresh 때문에 `unsafe-eval` 을 요구한다.
          // 07_AUTH_SECURITY.md §6 의 CSP 는 그것을 허용하지 않으므로
          // E2E 는 항상 프로덕션 빌드로 검증한다.
          command:
            'pnpm --filter @aidream/web build && pnpm --filter @aidream/web start',
          url: `${baseURL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 300_000,
          stdout: 'ignore',
          stderr: 'pipe',
        },
      }),
})
