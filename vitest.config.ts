import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const webRoot = fileURLToPath(new URL('./apps/web/', import.meta.url))

export default defineConfig({
  // apps/web 의 `@/*` 경로 별칭. tsconfig 의 paths 와 짝을 이룬다.
  resolve: {
    alias: [{ find: /^@\//u, replacement: webRoot }],
  },
  test: {
    // CI 는 워크플로 로그 다운로드에 관리자 권한이 필요하다. github-actions
    // 리포터는 실패를 annotation 으로 올려 로그 없이도 원인을 볼 수 있게 한다.
    reporters:
      process.env.CI === undefined
        ? ['default']
        : ['default', 'github-actions'],
    include: [
      'packages/**/*.test.ts',
      'packages/**/*.test.tsx',
      'scripts/**/*.test.ts',
      'apps/**/*.test.ts',
      'apps/**/*.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'packages/core/src/**/*.ts',
        'packages/db/src/**/*.ts',
        'apps/web/src/**/*.ts',
        'packages/queue/src/**/*.ts',
        'packages/storage/src/**/*.ts',
        'scripts/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/dist/**',
        'packages/core/src/index.ts',
        // 10_NFR.md §8 — 라우트는 E2E 로 대체, 컴포넌트는 선별
        'apps/web/app/**',
        'apps/web/e2e/**',
        'apps/web/src/components/**',
        'apps/web/src/auth/types.ts',
      ],
      // 값의 원천은 00_SPEC/10_NFR.md §8 이다.
      thresholds: {
        branches: 65,
        functions: 70,
        lines: 70,
        statements: 70,
        'packages/core/src/**/*.ts': {
          branches: 85,
          functions: 90,
          lines: 90,
          statements: 90,
        },
        'packages/db/src/**/*.ts': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        'apps/web/src/http/**/*.ts': {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85,
        },
        'apps/web/src/services/**/*.ts': {
          branches: 70,
          functions: 75,
          lines: 75,
          statements: 75,
        },
        // 10_NFR.md §8 — packages/queue 70%
        'packages/queue/src/**/*.ts': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        // 10_NFR.md §8 — packages/storage 70% (MinIO 통합)
        'packages/storage/src/**/*.ts': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        'scripts/**/*.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
  },
})
