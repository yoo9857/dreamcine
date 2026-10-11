# 2026-10-12 작업 이동 인수인계

## 이어받기

저장소: https://github.com/yoo9857/dreamcine, 브랜치 `main`.

```powershell
git clone https://github.com/yoo9857/dreamcine.git
cd dreamcine
corepack enable
corepack pnpm install --frozen-lockfile
corepack pnpm exec prisma generate --schema prisma/schema.prisma
```

Node.js는 저장소 지정 버전인 22.x, pnpm은 `packageManager`의 9.15.9를 사용한다. 기존 체크아웃은 작업을 보존한 뒤 `git pull --ff-only origin main`으로 갱신한다. 환경변수는 `.env.example`과 배포 문서에 따라 별도로 준비한다. 실제 환경파일·SSH 키·세션 토큰은 Git에 없다. 로컬 DB가 없는 development 모드에서 `/browse`와 `/watch/preview`는 개발 미리보기를 지원한다.

규칙·설계는 `docs/HARNESS.md`, `docs/INDEX.md`, `docs/_ISSUES.md`, 배포 절차는 `docs/20_OPS/O01_DEPLOY.md`를 확인한다. 이번에 새로 도입한 DB 마이그레이션은 없다.

## 실제 운영 상태

- 도메인: https://ilog.info
- 최종 운영 웹 이미지 SHA: `9fe4330fd23e26d4d6867359cb996383bce77866`.
- 이미지 빌드: https://github.com/yoo9857/dreamcine/actions/runs/38152667711 — 성공.
- 웹 배포: https://github.com/yoo9857/dreamcine/actions/runs/38153146346 — 성공, `deploy_worker=false`.
- 웹 healthy. `/api/ready`의 DB·Redis·스토리지·큐·메일 모두 `ok`.
- 워커·스케줄러는 기존 `867c36e761831f47056a903252e36b6886913a81`로 healthy.
- 자료·인수인계 마무리 커밋은 운영 재배포가 필요 없다. 다음 앱 수정 시 새 SHA의 이미지를 빌드하고 그 SHA를 배포한다.

## 완료한 변경

- 검색: 히어로 제거, 작은 가로형 결과, 공통 상단 바·버튼·푸터, 키보드 탭, 검색어/대상의 URL 복원, 커서 더 보기 및 실패 재시도. 시리즈 검색의 제작자 등급·인증 필드 누락 수정.
- 재생: `max-height: 484px`에 의한 프레임 높이 불일치 제거. 원본 비율을 유지하며 일반·전체 화면의 영상 박스를 프레임 전체에 맞춤. NOW PLAYING 패널 대신 제목·연도·장르·시간·감독, 작은 크리에이터/조회/날짜 행. 장르·감독은 등록 데이터만 표시하며 에피소드 우선, 시리즈 보완. 태블릿 추천 목록의 가로 넘침 수정.
- 홈: “취향이 열리는 순간, ilog.” 임시 배너 및 중첩 Suspense 제거. 첫 콘텐츠가 준비될 때까지 단일 라우트 로딩 경계 사용.
- 탐색: 동일 작품을 회전해 장르처럼 표시하던 선반을 실제 인기·최신·롱폼·숏폼·Higgsfield 큐레이션으로 정리. “모두 보기”·탭·푸터를 실제 목록에 연결. `/works?sort=popular|latest&format=long|short` 지원, 첫 페이지/커서 정렬 일치, 필터의 새로고침·뒤로 가기 복원. 썸네일 없는 작품 누락 및 비로그인 푸터의 잘못된 프로필 연결 수정.
- 로고: 운영의 `/_next/image?...leftlogo.png&w=256...` 요청 정체 발견. 원본 디자인·비율·투명도를 유지한 480×160 WebP(22,696바이트)를 직접 제공한다. 원본 PNG는 보존하며 런타임 이미지 변환을 사용하지 않는다.

## 검사 결과 및 재현

관련 검색 단위·회귀 검사 34개, 재생/메타데이터/플레이어 검사 13개, 마지막 홈·목록·공통 컴포넌트 묶음 35개 통과. 서로 겹치는 묶음이므로 합산 총수로 해석하지 않는다. 저장소 lint·TypeScript·dependency-cruiser·Prettier 검사 통과. 전체 DB 통합/Lighthouse 게이트를 실행한 것은 아니며 O01 Fast lane을 적용했다.

최종 Playwright 묶음 `search.e2e.ts`, `player-layout.e2e.ts`, `catalog-navigation.e2e.ts`: 17개 통과, 로컬 미리보기 전용 1개 생략. 320~1440px 검색/목록, 실제 API 응답, 키보드·페이지 이동·뒤로 가기·새로고침, 영상 재생 진행·전체 화면, 실제 로고 로드 확인을 포함한다. 별도 운영 로그인 홈에서 모바일·데스크톱, 홍보 배너 부재, 모든 선반의 실제 이동 검사 1개 통과. 비공개 임시 VIEWER QA 계정과 세션은 검사 후 삭제했다. CSP 우회는 로컬 React Refresh 검사에만 사용했다.

운영 공개 화면 검사는 일반 Playwright 설치 환경에서 다음처럼 실행한다. 개발 서버를 띄우지 않도록 환경변수를 설정한다.

```powershell
$env:APP_URL='https://ilog.info'
$env:PLAYWRIGHT_SKIP_WEB_SERVER='1'
$env:WATCH_QA_LIVE='1'
Remove-Item Env:SEARCH_QA_DEV -ErrorAction SilentlyContinue
corepack pnpm exec playwright test search.e2e.ts player-layout.e2e.ts catalog-navigation.e2e.ts --workers=2
```

브라우저가 없으면 `corepack pnpm exec playwright install chromium`으로 설치한다. 운영 로그인 홈 검사는 정상 로그인 세션을 별도로 준비해야 한다. 임시 QA 생성 스크립트·세션·인증정보는 공유하지 않는다.

## 자료 보존 및 다음 작업 주의

사용자의 작업 이동 요청에 따라 루트 참고 이미지·버그 캡처·포스터 캐러셀·`watch-on-the-bar-1920x1080.mp4`도 Git에 보존한다. 이 파일들은 디자인/원본 참고 자료이며 운영의 `apps/web/public`에 자동 배치되는 자산이 아니다. 원본 경로를 유지한다. `.tmp`, `test-results`, `.next`, `node_modules`, 실제 `.env`·인증키는 로컬 실행 자료이므로 제외한다.

앱 개선 요청은 이번 범위에서 배포와 운영 확인까지 완료했다. 다음 요청에서 로그인/업로드/결제 등 다른 전체 흐름까지 모두 검증됐다고 가정하지 않는다. 기존 기술 부채는 `docs/_ISSUES.md`와 이전 인수인계를 확인한다. 개별 변경 근거는 `docs/20_OPS/RELEASE_2026-10-11_SEARCH_UI.md` 및 `RELEASE_2026-10-12_*` 문서에 있다.
