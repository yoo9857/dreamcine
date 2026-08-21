const eslint = require('@eslint/js')
const eslintConfigPrettier = require('eslint-config-prettier')
const tseslint = require('typescript-eslint')

module.exports = tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/dist/**',
      '**/playwright-report/**',
      '**/test-results/**',
      // Next.js 가 생성·갱신하는 타입 진입점
      '**/next-env.d.ts',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/require-await': 'error',
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/client'],
              message: 'packages/db 를 경유하세요',
            },
            {
              group: ['../../*'],
              message: '패키지 경계를 넘는 상대경로 금지',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CatchClause[body.body.length=0]',
          message: '빈 catch 금지 — O02_EXCEPTION_POLICY 참조',
        },
      ],
    },
  },
  {
    files: [
      'packages/db/src/**/*.ts',
      'packages/db/tests/**/*.ts',
      'prisma/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
  {
    // 08_UIUX_SPEC.md §7 — 컴포넌트에 색상/간격 리터럴 작성 금지. 토큰만 사용.
    // "린트로 차단한다" 가 스펙 문구이므로 기계가 막는다.
    //
    // 값의 정의 지점(`packages/ui/src/tokens`)은 당연히 제외한다.
    files: [
      'packages/ui/src/primitives/**/*.tsx',
      'packages/ui/src/layout/**/*.tsx',
      'apps/web/src/components/**/*.tsx',
      'apps/web/app/**/*.tsx',
    ],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CatchClause[body.body.length=0]',
          message: '빈 catch 금지 — O02_EXCEPTION_POLICY 참조',
        },
        {
          // #fff · #1a2b3c · rgb() · hsl()
          selector:
            'Literal[value=/#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\\b|(rgb|rgba|hsl|hsla)\\(/]',
          message:
            '색 리터럴 금지. packages/ui 토큰과 그 유틸리티 클래스를 쓰세요. (08_UIUX_SPEC §7)',
        },
        {
          selector:
            'TemplateElement[value.raw=/#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?\\b|(rgb|rgba|hsl|hsla)\\(/]',
          message:
            '색 리터럴 금지. packages/ui 토큰과 그 유틸리티 클래스를 쓰세요. (08_UIUX_SPEC §7)',
        },
        {
          // Tailwind 임의값 안의 px/rem/em 길이: p-[13px], gap-[1.5rem] …
          // 뷰포트 단위(dvh/vh/vw/svh)는 화면 비율이라 토큰 대상이 아니므로 허용한다.
          selector: 'Literal[value=/\\[[^\\]]*[0-9](px|rem|em)\\b/]',
          message:
            '간격·크기 리터럴 금지. 토큰 스케일 유틸리티를 쓰세요. (08_UIUX_SPEC §7)',
        },
        {
          selector:
            'TemplateElement[value.raw=/\\[[^\\]]*[0-9](px|rem|em)\\b/]',
          message:
            '간격·크기 리터럴 금지. 토큰 스케일 유틸리티를 쓰세요. (08_UIUX_SPEC §7)',
        },
        {
          // min-[1440px]: 같은 임의 브레이크포인트. 이름 있는 것을 쓴다.
          selector: 'Literal[value=/(min|max)-\\[/]',
          message:
            '임의 브레이크포인트 금지. 토큰이 정의한 이름(예: wide:)을 쓰세요. (08_UIUX_SPEC §2)',
        },
      ],
    },
  },
  {
    files: ['**/*.cjs', '**/*.js', '**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      globals: {
        module: 'readonly',
        require: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  eslintConfigPrettier,
)
