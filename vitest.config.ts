import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

const webRoot = fileURLToPath(new URL('./apps/web/', import.meta.url))

export default defineConfig({
  // apps/web 의 `@/*` 경로 별칭. tsconfig 의 paths 와 짝을 이룬다.
  resolve: {
    alias: [{ find: /^@\//u, replacement: webRoot }],
  },
  test: {
    include: [
      'packages/**/*.test.ts',
      'scripts/**/*.test.ts',
      'apps/**/*.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'packages/core/src/**/*.ts',
        'packages/db/src/**/*.ts',
        'apps/web/src/**/*.ts',
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
