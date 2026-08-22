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
          //
          // CI 는 `Build web app` 스텝에서 미리 빌드하므로 실행만 한다.
          // 로컬은 한 번에 되도록 빌드까지 함께 돌린다.
          //
          // CI 는 **프로덕션이 실제로 실행하는 것** 을 띄운다. Docker 런너는
          // standalone 산출물을 `node apps/web/server.js` 로 돌린다
          // (infra/docker/web.Dockerfile). `next start` 로 검증하면 standalone
          // 번들에서만 드러나는 문제(추적 누락된 런타임 의존성, 정적 파일
          // 경로)가 E2E 를 그냥 통과한다 — "E2E 초록 = 프로덕션 기동 안전" 이
          // 성립하지 않는다. (OBS-010)
          //
          // 레이아웃 준비는 워크플로의 `Prepare standalone server` 스텝이
          // Dockerfile 과 같은 순서로 한다.
          //
          // 로컬(Windows)은 standalone 빌드 자체가 심볼릭 링크 권한으로
          // 실패하므로 `next start` 경로를 유지한다.
          command:
            process.env.CI === undefined
              ? 'pnpm --filter @aidream/web build && pnpm --filter @aidream/web start'
              : 'node apps/web/.next/standalone/apps/web/server.js',
          url: `${baseURL}/api/health`,
          reuseExistingServer: !process.env.CI,
          timeout: 300_000,
          // 서버가 못 뜨는 이유를 워크플로 로그에서 볼 수 있어야 한다.
          stdout: 'pipe',
          stderr: 'pipe',
        },
      }),
})
