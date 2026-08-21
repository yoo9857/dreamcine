import { defineConfig } from 'vitest/config'

export default defineConfig({
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
        'apps/web/src/auth/types.ts',
      ],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
        'packages/core/src/**/*.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'scripts/**/*.ts': {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
        'packages/db/src/**/*.ts': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
        'apps/web/src/**/*.ts': {
          branches: 70,
          functions: 70,
          lines: 70,
          statements: 70,
        },
      },
    },
  },
})
