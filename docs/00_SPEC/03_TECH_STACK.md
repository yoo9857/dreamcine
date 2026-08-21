# 03 — 기술스택 · 버전 고정 · 허용 목록

> 상태: **불변 계약**. CODEX 수정 금지.
> **이 문서에 없는 라이브러리를 추가하면 하네스 위반이다.**
> 필요하면 `_ISSUES.md` 에 제안하고 멈춘다.

---

## 1. 런타임 · 도구 (정확히 이 버전)

| 항목 | 버전 | 고정 방법 |
|---|---|---|
| Node.js | 22 LTS | `.nvmrc`, `package.json engines`, Docker 베이스 이미지 |
| pnpm | 9.x | `packageManager` 필드 |
| TypeScript | 5.6+ | devDependency |
| ffmpeg | 7.x (정적 빌드) | `worker.Dockerfile` 에서 버전 고정 설치 |
| PostgreSQL | 16 | Docker 이미지 태그 `postgres:16-alpine` |
| Redis | 7.x | `redis:7-alpine` |
| Docker Compose | v2 | — |

**규칙**: 모든 Docker 이미지 태그에 `latest` 금지. 다이제스트 또는 정확한 마이너까지 명시.

## 2. 프론트엔드

| 목적 | 선택 | 비고 |
|---|---|---|
| 프레임워크 | **Next.js 15** (App Router) | `output: 'standalone'` |
| 언어 | TypeScript (strict) | `strict`, `noUncheckedIndexedAccess` 켠다 |
| 스타일 | **Tailwind CSS 4** | 디자인 토큰은 `packages/ui/tokens` |
| 컴포넌트 프리미티브 | **Radix UI** | 접근성 확보 목적 |
| 아이콘 | **lucide-react** | |
| 폼 | **react-hook-form** + **zod** | 검증 스키마는 `packages/core` 공유 |
| 서버 상태 | **@tanstack/react-query 5** | 무한스크롤 피드 |
| 클라이언트 상태 | **zustand** | 플레이어/업로더 국소 상태만 |
| 영상 재생 | **hls.js** | Safari는 네이티브 HLS 우선 |
| 날짜 | **date-fns** | moment/dayjs 금지 |
| PWA | 직접 작성한 `sw.js` | 플러그인 미사용 (제어권 확보) |

**금지**: styled-components, emotion, MUI, Chakra, axios, lodash, moment, dayjs, redux

## 3. 백엔드

| 목적 | 선택 | 비고 |
|---|---|---|
| API 런타임 | Next.js **Route Handler** | 별도 서버 프레임워크 없음 |
| 인증 | **Auth.js v5** (`next-auth`) | DB 세션 전략 (JWT 아님) |
| 비밀번호 | **@node-rs/argon2** | bcrypt 금지 |
| ORM | **Prisma 5** | 마이그레이션 필수 |
| DB | PostgreSQL 16 | |
| 큐 | **BullMQ 5** + Redis | |
| 검증 | **zod 3** | 모든 외부 입력의 유일한 관문 |
| S3 클라이언트 | **@aws-sdk/client-s3** + `@aws-sdk/s3-request-presigner` | Linode Object Storage 호환 |
| 로깅 | **pino** | JSON lines |
| 메트릭 | **prom-client** | `/api/metrics` |
| 레이트리밋 | 자체 구현 (Redis `INCR`+`EXPIRE`) | 외부 SaaS 미사용 |
| 이메일 | **nodemailer** (SMTP) | 인증메일/알림 |
| 이미지 처리 | **sharp** | 썸네일 리사이즈/webp |

**금지**: Express, NestJS, Fastify(별도 서버), TypeORM, Sequelize, Mongoose, JWT 자체구현

## 4. 테스트 · 품질

| 목적 | 선택 |
|---|---|
| 단위/통합 | **Vitest 2** |
| DB 통합 | **@testcontainers/postgresql** |
| E2E | **Playwright** |
| 컴포넌트 | **@testing-library/react** |
| HTTP 모킹 | **msw** |
| 린트 | **ESLint 9** (flat config) + `@typescript-eslint` |
| 포맷 | **Prettier 3** |
| 의존 방향 | **dependency-cruiser** |
| 커밋 규격 | **commitlint** + **husky** |
| 커버리지 | Vitest v8 provider |

## 5. 인프라

| 목적 | 선택 |
|---|---|
| 호스팅 | **Akamai(Linode) VPS** — Ubuntu 24.04 LTS |
| 오브젝트 스토리지 | **Linode Object Storage** (S3 호환) |
| CDN | **Akamai CDN** |
| 리버스 프록시 / TLS | **Caddy 2** (자동 인증서) |
| 컨테이너 | Docker + Compose v2 |
| CI | GitHub Actions (게이트 실행) |
| 로컬 S3 | **MinIO** (개발만) |
| 시크릿 | `.env` 파일 + 파일 권한 600 (외부 볼트 미사용) |

## 6. 환경변수 계약

**규칙**: 모든 환경변수는 `packages/core/src/env.ts` 의 zod 스키마를 통과해야 한다.
앱 부팅 시 검증 실패하면 **즉시 종료**한다 (부팅 후 런타임 실패 금지).

```ts
// packages/core/src/env.ts (S2에서 만들 시그니처)
export const ServerEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  APP_URL: z.string().url(),

  DATABASE_URL: z.string().startsWith('postgresql://'),
  REDIS_URL: z.string().startsWith('redis://'),

  AUTH_SECRET: z.string().min(32),
  AUTH_GOOGLE_ID: z.string().optional(),
  AUTH_GOOGLE_SECRET: z.string().optional(),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_BUCKET_ORIGINALS: z.string().min(1),
  S3_BUCKET_HLS: z.string().min(1),
  S3_BUCKET_THUMBS: z.string().min(1),

  CDN_BASE_URL: z.string().url(),

  SMTP_URL: z.string().optional(),
  MAIL_FROM: z.string().email().optional(),

  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  FFPROBE_PATH: z.string().default('ffprobe'),
  TMP_DIR: z.string().default('/tmp/aidream'),

  LOG_LEVEL: z.enum(['trace','debug','info','warn','error']).default('info'),
})
export type ServerEnv = z.infer<typeof ServerEnvSchema>
```

`.env.example` 은 위 키 전부를 **값 없이** 나열하고 각 줄에 주석으로 설명을 단다.

### 클라이언트에 노출 가능한 변수 (오직 이것뿐)

| 변수 | 용도 |
|---|---|
| `NEXT_PUBLIC_APP_URL` | 절대 URL 생성 |
| `NEXT_PUBLIC_CDN_BASE_URL` | 미디어 URL 조립 |

**그 외 `NEXT_PUBLIC_` 변수 추가 금지.** 시크릿 유출 경로가 된다.

## 7. TypeScript 설정 (하네스의 뼈대)

```jsonc
// packages/config/tsconfig/base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,     // 배열 접근 undefined 강제 인식
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "skipLibCheck": true,
    "declaration": true,
    "composite": true,
    "incremental": true
  }
}
```

이 옵션들은 **끄지 않는다.** 특히 `noUncheckedIndexedAccess` 는 ffmpeg 출력 파싱과
페이지네이션 커서 처리에서 실제 버그를 막는다.

## 8. ESLint 필수 규칙 (하네스)

```js
// packages/config/eslint/base.cjs — 발췌
rules: {
  '@typescript-eslint/no-explicit-any': 'error',
  '@typescript-eslint/no-unsafe-assignment': 'error',
  '@typescript-eslint/no-floating-promises': 'error',      // await 누락 = 유실된 작업
  '@typescript-eslint/no-misused-promises': 'error',
  '@typescript-eslint/switch-exhaustiveness-check': 'error', // 상태 추가 시 누락 방지
  '@typescript-eslint/require-await': 'error',
  'no-console': 'error',                                   // logger 강제
  'no-restricted-imports': ['error', { patterns: [
    { group: ['@prisma/client'], message: 'packages/db 를 경유하세요' },
    { group: ['../../*'],        message: '패키지 경계를 넘는 상대경로 금지' },
  ]}],
  'no-restricted-syntax': ['error',
    { selector: 'CatchClause[body.body.length=0]', message: '빈 catch 금지 — O02_EXCEPTION_POLICY 참조' },
  ],
}
```

## 9. 라이브러리 추가 절차 (유일한 합법 경로)

```
1. docs/_ISSUES.md 에 [DEP-###] 항목 작성
   - 무엇을: 패키지명 + 버전
   - 왜: 직접 구현 대비 이득
   - 대안 검토: 이미 허용된 것으로 안 되는 이유
   - 위험: 번들 크기 / 유지보수 상태 / 라이선스
2. 작업 정지. 사람 승인 대기.
3. 승인되면 사람이 이 문서(03)에 추가한다.
4. CODEX는 이 문서가 갱신된 것을 확인한 뒤 설치한다.
```

`pnpm-lock.yaml` 에 이 문서와 대조되지 않는 직접 의존성이 있으면
`scripts/contract/check-deps.ts` 가 CI 에서 실패시킨다.
