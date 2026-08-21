# T14 — 디자인 시스템: 토큰 · 프리미티브 · 테마

## 진행 상태

- [x] S1 Spec 확인 — 2026-08-22 / 산출물 48개 확정 (사용자 승인: A안)
- [ ] S2 Skeleton
- [ ] S3 구현

> **실행 순서상 위치는 T07 앞이다.** 번호는 문서가 추가된 순서일 뿐이며,
> T07(플레이어 UI) · T09(피드) · T10(소셜) · T12(심사큐)가 이 산출물을 소비한다.
> `INDEX.md` §2 의 의존 그래프를 참조한다.

### 왜 별도 태스크인가

`08_UIUX_SPEC.md` §6·§7 은 프리미티브 21개와 토큰 구조를 **계약으로 고정**하면서
값은 비워 두었다. T03 은 인증 화면만 만들었으므로 이 계약은 아직 이행되지 않았고,
`packages/ui` 는 빈 껍데기다. 후속 태스크가 각자 자기 화면에서 즉석으로
버튼과 색을 만들면 토큰 계약이 무의미해진다. 그래서 소비자보다 먼저 세운다.

---

## 1. 목적

`08_UIUX_SPEC.md` §6·§7 의 컴포넌트·토큰 계약을 이행한다. 이 태스크 이후 만들어지는
모든 화면은 **색·간격 리터럴을 쓸 수 없고**, 접근성·상태 4종·다크/라이트를
프리미티브에서 공짜로 얻는다.

## 2. 참조 스펙

- `../00_SPEC/08_UIUX_SPEC.md` §2 레이아웃, §3 상태, §6 컴포넌트, §7 토큰, §8 반응형, §10 문구
- `../00_SPEC/02_REPO_LAYOUT.md` §4 `packages/ui`, `apps/web/src/styles`
- `../00_SPEC/03_TECH_STACK.md` §2 프론트엔드, §4 테스트, §8 ESLint
- `../00_SPEC/10_NFR.md` §1 성능, §8 커버리지, §10 접근성
- `../00_SPEC/09_ERROR_CATALOG.md` §5 문구 사전 (이미 T03 에서 구현)

## 3. 산출물 파일

### 토큰 (값의 유일한 정의 지점)

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/ui/src/tokens/index.ts` | 색·간격·반경·폰트·z 토큰 값 | S2→S3 |
| `packages/ui/src/tokens/contrast.ts` | WCAG 상대휘도·대비비 계산 (순수) | S2→S3 |
| `packages/ui/src/tokens/theme.css` | 토큰에서 파생된 CSS 변수 (다크 기본 + 라이트) | S3 (생성물) |
| `packages/ui/tests/tokens.test.ts` | 대비 4.5:1 / 큰 텍스트 3:1 전수 검증 | S3 |
| `packages/ui/tests/contrast.test.ts` | 대비 계산기 자체 검증 (기준값 대조) | S3 |

### 프리미티브 (`packages/ui/src/primitives/`)

`08_UIUX_SPEC.md` §6 목록 그대로 21개. 전부 S2→S3.

| 자체 구현 | Radix 기반 |
|---|---|
| `Button` `IconButton` `Input` `Textarea` `Badge` `Skeleton` `Spinner` `Pagination` `EmptyState` `ErrorState` | `Select` `Checkbox` `Switch` `Dialog` `Sheet` `DropdownMenu` `Tabs` `Tooltip` `Toast` `Avatar` `Progress` |

Radix 기반을 쓰는 이유는 `03_TECH_STACK.md` §2 의 "접근성 확보 목적" 그대로다 —
포커스 트랩·roving tabindex·`aria-*` 조합을 직접 만들지 않는다.

### 레이아웃 (`packages/ui/src/layout/`)

| 경로 | 책임 | 단계 |
|---|---|---|
| `Stack.tsx` | 축·간격·정렬 (간격은 토큰만) | S2→S3 |
| `Grid.tsx` | `08_UIUX §2` 브레이크포인트 열 수(1/2/3/4) | S2→S3 |
| `Container.tsx` | 최대폭·좌우 여백 | S2→S3 |

### 패키지 배선

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/ui/src/index.ts` | 토큰·프리미티브·레이아웃 공개 배럴 | S2→S3 |
| `packages/ui/package.json` | react·Radix·lucide 의존성, `.` 와 `./theme.css` exports | S2 |
| `packages/ui/tests/primitives.test.tsx` | 상태·키보드·`aria-*` 검사 | S3 |
| `packages/ui/tests/layout.test.tsx` | 축·간격·열 수 검사 | S3 |

### apps/web 배선

| 경로 | 책임 | 단계 |
|---|---|---|
| `apps/web/package.json` | tailwind·Radix·lucide·react-hook-form 추가 | S2 |
| `apps/web/postcss.config.mjs` | `@tailwindcss/postcss` | S2 |
| `apps/web/src/styles/theme.css` | 토큰 CSS 변수 → Tailwind `@theme` 브리지 | S3 |
| `apps/web/app/globals.css` | Tailwind 진입점 + 기본 문서 스타일 | S3 |
| `apps/web/app/layout.tsx` | 테마 쿠키 반영, 프리미티브 프로바이더 | S3 |
| `apps/web/src/lib/theme.ts` | 테마 쿠키 읽기·쓰기 단일 지점 | S2→S3 |
| `apps/web/src/components/ThemeToggle.tsx` | 수동 테마 토글 | S2→S3 |
| `apps/web/src/lib/messages/ko.ts` | 화면 문구 집중 (`08 §10`) | S3 |
| `apps/web/src/lib/messages/index.ts` | i18n 구조 (`ko` 만 채운다) | S2→S3 |

### 인증 화면 재작업

| 경로 | 책임 | 단계 |
|---|---|---|
| `apps/web/src/components/auth/LoginForm.tsx` | 프리미티브 + react-hook-form 기반 | S3 |
| `apps/web/src/components/auth/SignupForm.tsx` | 동일. 필드별 오류를 `Input` 에 위임 | S3 |
| `apps/web/src/components/auth/VerifyStatus.tsx` | 상태 4종을 `Spinner`/`EmptyState`/`ErrorState` 로 | S3 |
| `apps/web/e2e/auth.e2e.ts` | 테마 토글·키보드 조작 검사 추가 | S3 |

### 하네스

| 경로 | 책임 | 단계 |
|---|---|---|
| `packages/config/eslint/base.cjs` | 색·간격 리터럴 금지 규칙 (`08 §7`) | S3 |
| `scripts/contract/check-tokens.ts` | `theme.css` 가 토큰에서 파생된 최신 상태인지 | S3 |
| `scripts/contract/check-tokens.test.ts` | 검사기 자체 검증 | S3 |
| `package.json` | `contract:tokens` 를 `gate:contract` 에 편입 | S3 |
| `vitest.config.ts` | `packages/ui` 커버리지·jsdom 환경 | S3 |

## 4. S2 Skeleton

### 토큰 계약 (이 모양이 이후 모든 화면을 규정한다)

```ts
// packages/ui/src/tokens/index.ts
export interface ColorScale {
  readonly base: string
  readonly hover?: string
  readonly subtle?: string
}

export interface Tokens {
  readonly color: {
    readonly bg: { base: string; elevated: string; overlay: string }
    readonly fg: { primary: string; secondary: string; muted: string }
    readonly accent: { base: string; hover: string; subtle: string }
    readonly danger: { base: string; subtle: string }
    readonly warning: { base: string; subtle: string }
    readonly success: { base: string; subtle: string }
    readonly border: { base: string; subtle: string }
  }
  readonly space: Record<1 | 2 | 3 | 4 | 6 | 8 | 12, string>
  readonly radius: { sm: string; md: string; lg: string; full: string }
  readonly font: { sans: string; mono: string }
  readonly z: { base: number; sticky: number; overlay: number; modal: number; toast: number }
}

/** 다크 기본. 라이트는 같은 키를 덮어쓴다. */
export const darkTokens: Tokens
export const lightTokens: Tokens
```

### 프리미티브 공통 계약

```tsx
// 모든 프리미티브가 지키는 3가지
// 1. className 을 받아 합성 가능 (도메인 컴포넌트가 배치를 결정)
// 2. ref 전달 (Radix 합성과 포커스 관리에 필요)
// 3. 색·간격 리터럴 없음 — Tailwind 토큰 클래스만
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}
export function Button(props: ButtonProps): ReactNode {
  throw new NotImplementedError('T14:button')
}
```

## 5. S3 구현 순서

| # | 마커 | 내용 |
|---|---|---|
| 1 | `T14:contrast` | WCAG 상대휘도·대비비 계산. 기준값으로 먼저 검증한다 |
| 2 | `T14:tokens` | 다크·라이트 토큰 값 확정. **대비 테스트를 통과할 때까지 값을 고친다** |
| 3 | `T14:themeCss` | 토큰 → CSS 변수 파생. `contract:tokens` 가 드리프트를 막는다 |
| 4 | `T14:tailwind` | `@theme` 브리지. 토큰 이름이 그대로 유틸리티 클래스가 된다 |
| 5 | `T14:layout` | Stack · Grid · Container |
| 6 | `T14:button` … | 프리미티브 21개. 자체 구현 → Radix 기반 순서 |
| 7 | `T14:theme` | 쿠키 기반 테마. **인라인 스크립트 없이** 깜빡임 없는 전환 (OBS-005) |
| 8 | `T14:messages` | 문구 집중. `08 §10` 톤 규칙 |
| 9 | `T14:authForms` | 인증 3화면 재작업 |
| 10 | `T14:lintTokens` | 색·간격 리터럴 금지 린트 규칙 |

### 테마 전환에 인라인 스크립트를 쓰지 않는 이유

흔한 구현은 `<head>` 에 인라인 스크립트를 넣어 첫 페인트 전에 테마 클래스를
붙이는 것이다. 그러나 우리 CSP 는 `unsafe-inline` 을 허용하지 않는다(OBS-005).
그래서 **서버가 쿠키를 읽어 `<html data-theme>` 를 직접 렌더**한다. 깜빡임도
없고 CSP 도 지킨다. 부수효과로 루트 레이아웃이 동적 렌더가 되어 모든 페이지가
nonce 를 받는다 — OBS-005 의 남은 결합이 함께 해소된다.

## 6. 예외처리

| 상황 | 처리 |
|---|---|
| 대비 미달 토큰 | **테스트 실패.** 값을 고친다. 기준을 낮추지 않는다 |
| `theme.css` 가 토큰과 어긋남 | `contract:tokens` 실패 → 재생성 |
| 컴포넌트에 색·간격 리터럴 | 린트 실패 → 토큰 클래스로 교체 |
| 테마 쿠키 값이 이상함 | 시스템 설정(`prefers-color-scheme`)으로 폴백. 던지지 않는다 |
| Radix 미지원 브라우저 | `10_NFR §9` 지원 목록 밖. 대응하지 않는다 |

## 7. 테스트

| 케이스 | 방식 |
|---|---|
| 본문 색 대비 ≥ 4.5:1 (다크·라이트 **양쪽**) | 단위 (전수) |
| 큰 텍스트·비텍스트 대비 ≥ 3:1 | 단위 (전수) |
| 대비 계산기가 알려진 기준값과 일치 | 단위 |
| `theme.css` ↔ 토큰 일치 | 계약 (`contract:tokens`) |
| 프리미티브 21개가 `className` 을 합성한다 | 단위 |
| `Button` 로딩 중 클릭이 막힌다 | 단위 |
| `Input` 오류 상태가 `aria-invalid` + 설명 연결 | 단위 |
| `Dialog` 포커스 트랩·`Esc` 닫기 | 단위 |
| `Tabs` 좌우 화살표 이동 | 단위 |
| `EmptyState`/`ErrorState` 가 다음 행동을 항상 제시 | 단위 (`08 §10`) |
| `Grid` 가 브레이크포인트별 열 수를 만든다 | 단위 |
| 색·간격 리터럴이 있으면 린트가 막는다 | 하네스 자체 검사 |
| 테마 토글이 깜빡임 없이 바뀐다 | E2E |
| 키보드만으로 로그인 완주 | E2E |

## 8. 완료 조건 (DoD)

- [ ] `pnpm gate` 통과
- [ ] 잔존 `NotImplementedError('T14:...')` = 0
- [ ] `08_UIUX_SPEC.md` §6 의 프리미티브 21개 + 레이아웃 3개 전부 존재
- [ ] 다크·라이트 양쪽에서 대비 기준 전수 통과
- [ ] `packages/ui`·`apps/web/src/components` 에 색·간격 리터럴 0건 (린트 확인)
- [ ] 인증 3화면이 프리미티브만으로 구성됨 (`<input>`/`<button>` 직접 사용 0건)
- [ ] 키보드만으로 로그인 완주 (E2E)
- [ ] 초기 JS ≤ 200KB gzip (`10_NFR §1`)
