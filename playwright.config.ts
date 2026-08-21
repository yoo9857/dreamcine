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
          command: 'pnpm --filter @aidream/web dev',
          url: `${baseURL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          stdout: 'ignore',
          stderr: 'pipe',
        },
      }),
})
