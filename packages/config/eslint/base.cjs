const eslint = require('@eslint/js')
const eslintConfigPrettier = require('eslint-config-prettier')
const tseslint = require('typescript-eslint')

/**
 * 여러 블록이 `no-restricted-syntax` 를 쓴다. ESLint flat config 는 같은 규칙을
 * **덮어쓰므로**(합치지 않는다) 겹치는 파일에서는 마지막 블록만 살아남는다.
 * 그래서 각 블록이 필요한 항목을 모두 나열해야 한다 — 손으로 중복하면 한쪽만
 * 바뀌어 조용히 갈라지므로 여기서 한 번만 정의한다.
 */
const EMPTY_CATCH = {
  selector: 'CatchClause[body.body.length=0]',
  message: '빈 catch 금지 — O02_EXCEPTION_POLICY 참조',
}

/**
 * 06_MEDIA_PIPELINE.md §5 — "앱 코드에서 문자열로 CDN 도메인을 이어붙이는 것은
 * 린트로 금지한다". 스펙이 린트를 지목했으므로 기계가 막는다.
 *
 * base URL 을 읽지 못하면 CDN URL 을 조립할 수 없다. 그래서 env 참조 자체를
 * 막는 것이 가장 정확한 금지선이다. 유일한 예외는 조립 지점인
 * `packages/storage/src/cdn.ts` 와 스키마 정의 지점이다.
 */
const CDN_SINGLE_POINT = [
  {
    selector: "MemberExpression[property.name='CDN_BASE_URL']",
    message:
      'CDN base URL 은 packages/storage/src/cdn.ts 에서만 읽습니다. cdnUrl()·masterUrl()·thumbUrl() 을 쓰세요. (06_MEDIA_PIPELINE §5)',
  },
  {
    selector: "MemberExpression[property.name='NEXT_PUBLIC_CDN_BASE_URL']",
    message:
      'CDN base URL 은 packages/storage/src/cdn.ts 에서만 읽습니다. (06_MEDIA_PIPELINE §5)',
  },
  {
    // process.env['CDN_BASE_URL'] 같은 우회
    selector: 'Literal[value=/CDN_BASE_URL/]',
    message:
      'CDN base URL 은 packages/storage/src/cdn.ts 에서만 읽습니다. (06_MEDIA_PIPELINE §5)',
  },
]

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
      '**/.tmp/**',
      // predev/prebuild가 node_modules의 MapLibre 번들을 그대로 복사하는 생성물
      '**/public/maplibre/**',
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
      'no-restricted-syntax': ['error', EMPTY_CATCH, ...CDN_SINGLE_POINT],
    },
  },
  {
    /*
      예외: CDN URL 조립의 유일 지점과 env 스키마 정의 지점.
      테스트도 예외다 — 테스트는 환경을 **구성**해야 하고(값 설정), 그것은
      제품 코드가 CDN 도메인을 손으로 잇는 것과 다른 행위다. 규칙이 지키려는
      것은 "도메인을 갈아탈 때 고칠 제품 코드가 한 파일" 이라는 성질이다.
    */
    files: [
      'packages/storage/src/cdn.ts',
      'packages/core/src/env.ts',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
    rules: {
      'no-restricted-syntax': ['error', EMPTY_CATCH],
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
        EMPTY_CATCH,
        ...CDN_SINGLE_POINT,
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
