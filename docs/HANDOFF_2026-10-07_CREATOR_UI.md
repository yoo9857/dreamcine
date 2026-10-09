# 다른 환경에서 이어서 작업하기 — 2026-10-07

## 현재 상태

- 저장소: https://github.com/yoo9857/dreamcine · 브랜치: `main`.
- 운영: https://ilog.info/creators · 시즌 컬렉션: https://ilog.info/creators/season-tags.
- 배포된 앱 SHA: `985b34a4d5b5d98ca3d4d11bc909c4c66b6382c4`.
- 이미지 빌드 성공: https://github.com/yoo9857/dreamcine/actions/runs/37615859751.
- 웹 배포 성공: https://github.com/yoo9857/dreamcine/actions/runs/37617004928.
- 웹 컨테이너 healthy, `/api/ready` 전체 checks 정상. 워커·스케줄러는 기존 버전을 유지.
- 관련 테스트 59개, lint/typecheck/depcruise/format 및 계약 검사 통과. 운영 브라우저에서 검색·슬라이드·태그 24종·프로필 태그·320/390px 화면 확인, 페이지/서버 오류 0건.
- 전체 DB 통합/E2E/Lighthouse 게이트를 모두 실행한 것은 아님. 배포는 `docs/20_OPS/O01_DEPLOY.md`의 개발 Fast lane을 사용.

## 새 컴퓨터에서 UI 미리보기

Node.js **22.x**와 Git을 먼저 설치한다. 패키지 매니저는 저장소가 지정한 pnpm **9.15.9**를 Corepack으로 실행한다.

```sh
git clone https://github.com/yoo9857/dreamcine.git
cd dreamcine
git switch main
corepack pnpm install --frozen-lockfile
corepack pnpm exec prisma generate --schema prisma/schema.prisma
```

`apps/web/.env.local`을 만들어 아래 개발 설정을 넣는다. 화면 디자인만 확인할 때는 `DATABASE_URL`을 설정하지 않는다.

```dotenv
CAPACITY_TIER=T0
APP_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

```sh
corepack pnpm --filter @aidream/web exec node scripts/copy-maplibre-worker.mjs
corepack pnpm --filter @aidream/web exec next dev --port 3001
```

열기: http://localhost:3001/creators, http://localhost:3001/creators/season-tags, http://localhost:3001/u/higgsfield.

DB 없는 개발 모드는 미리보기 작가 데이터를 사용한다. 운영은 실제 작가 3명을 표시하며 최대 5명까지 지원한다. 실제 로그인·회원가입·작품 저장을 검증하려면 개발용 PostgreSQL·Redis·스토리지와 해당 환경 설정이 필요하다. `.env.example`과 `infra/compose/docker-compose.dev.yml`을 기준으로 준비한다. 환경 파일·운영 비밀값·SSH 개인키는 Git에 들어 있지 않으며, 새 환경에 별도로 설정한다.

이미 체크아웃이 있다면 미커밋 작업을 먼저 보존하고 `git pull --ff-only origin main`으로 갱신한다. `.next`는 자동 생성되므로 다른 컴퓨터에서 복사할 필요가 없다. 로컬 개발 서버 두 개가 같은 `.next`를 동시에 쓰지 않게 한다.

## 수정할 파일

| 대상 | 파일 |
|---|---|
| 월별 선정 작가와 과거 기록 | `apps/web/src/content/creator-season-editions.ts` |
| 이미지 태그 생성 | `scripts/design/generate-creator-season-tag.mjs` |
| 생성 이미지·목록 | `apps/web/public/brand/tags/`, `apps/web/src/content/creator-season-artwork.generated.ts` |
| 작가 슬라이드·작품 목록 | `apps/web/src/components/creators/CreatorDirectory.tsx` |
| 입체 슬라이드 동작 | `apps/web/components/ui/coverflow-carousel.tsx` |
| 상단 검색·LIVE·알림 | `apps/web/src/components/discovery/DiscoveryTopbar.tsx` |
| 메탈 검색 버튼 | `apps/web/components/ui/liquid-metal-button.tsx` |
| 중복 로그인 버튼 방지 | `apps/web/src/components/layout/GuestSessionActions.tsx` |
| 프로필·공통 배지의 시즌 태그 | `apps/web/src/components/user/CreatorSeasonAwards.tsx`, `UserTierLine.tsx` |
| 스타일 | `apps/web/src/styles/discovery-home.css`, `creators-gallery.css`, `liquid-metal-button.css`, `creator-season-tag.css` |

공유 UI는 `apps/web/components/ui`, 기존 기능 컴포넌트는 `apps/web/src/components`에 둔다. Next.js·TypeScript·Tailwind·shadcn 경로 설정과 필요한 패키지는 이미 저장소에 포함되어 있다. 서비스에서 쓰는 이미지와 태그 생성 소스도 커밋되어 있다. 루트의 BUG 캡처·별도 디자인 참고 원본 및 `.tmp`의 로컬 QA 캡처는 서비스 실행 의존성이 아니므로 이번 앱 커밋에는 포함하지 않았다.

## 다음 달 태그

```sh
node scripts/design/generate-creator-season-tag.mjs 2026 11
# 새 연도의 전체 이미지:
node scripts/design/generate-creator-season-tag.mjs 2028 all
```

이미지 생성 후 `creator-season-editions.ts`에 `'2026.11': ['선정한 실제 핸들']`처럼 새 월을 추가한다. 이전 월 항목은 유지한다. 화면은 작은 크기에서도 선명한 SVG를 사용하며 투명 PNG 원본도 생성한다. 이미지 생성만으로 사용자에게 태그가 지급되지는 않는다. 이 선정 기록을 공통 배지와 프로필이 함께 읽으며, DB 등급이나 권한은 바꾸지 않는다.

## 검증·배포

```sh
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm depcruise
corepack pnpm format:check
corepack pnpm gate:contract
corepack pnpm exec vitest run apps/web/src/components/creators/CreatorDirectory.test.tsx apps/web/src/components/layout/GuestSessionActions.test.tsx apps/web/src/components/layout/MainNav.test.tsx apps/web/src/components/layout/RouteTransition.test.tsx apps/web/src/components/user/user-tier-line.test.tsx apps/web/src/services/user/get-featured-creators.test.ts apps/web/src/components/discovery/notification-bell.test.tsx apps/web/app/api/auth/session/route.test.ts apps/web/src/auth/server-session.test.ts apps/web/src/auth/config.test.ts
```

운영 CSP를 약화시키지 않는다. 브라우저 QA에서는 `waitForFunction` 내부의 eval이 CSP로 차단될 수 있으므로 DOM 속성에 대한 Playwright locator assertions 등을 사용한다. WebGL 없는 경우에도 검색은 정적 메탈 버튼으로 동작해야 한다.

변경을 commit/push한 후 GitHub `gate.yml`의 웹 이미지 게시 성공을 확인하고 `deploy.yml`에 해당 **40자리 앱 SHA**, `deploy_worker=false`를 전달한다. UI 작업 때문에 워커를 재시작하지 않는다. 문서만 수정한 커밋은 앱 이미지가 생성되지 않으므로 그 SHA로 앱을 배포하지 않는다. 배포 후 readiness·컨테이너·대상 화면을 확인한다. 현재 버전의 이전 앱 SHA는 `867c36e761831f47056a903252e36b6886913a81`이며 DB 스키마 변경은 없었다.

## 다음 작업자의 시작 메시지

```text
docs/HANDOFF_2026-10-07_CREATOR_UI.md를 먼저 읽고 main 최신 코드를 기준으로 이어서 작업해줘.
사용자가 제거한 크리에이터 헤더 카드, THE MONTHLY BEST 제목, 별도 홈으로 버튼을 다시 넣지 말아줘.
이달의 작가는 실제 데이터로 최대 5명, 시즌 태그는 월별 선정 기록으로 유지해줘.
검색 버튼과 입력창은 한 톤으로 유지하고, 상단 순서는 LIVE → 알림 → 계정이야.
운영 배포는 사용자가 요청할 때 웹만 진행하고, 검사 및 운영 확인 결과를 정확히 기록해줘.
```
