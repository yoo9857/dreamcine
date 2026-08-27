# 인수인계 — 2026-08-22

이어받는 사람이 **먼저 읽어야 할 한 장**이다.
전체 규칙은 `HARNESS.md`, 미해결 항목은 `_ISSUES.md`, 순서는 `INDEX.md`.

## 2026-08-27 가입·동의·연령 제한 운영 배포 완료

- OAuth 없이 자체 이메일 가입과 가입 후 인증 링크 방식을 유지했다.
- 가입 프로필·동의 저장에 이어 정책 문서, 계정 동의 관리, 마케팅 후보 필터,
  서명 수신거부 링크, 발송 직전 재검사, 저장 생년월일 기반 A19 판정을 연결했다.
- 운영 앱·워커 이미지는 `1b8ca3a1b8030a04418be8aa4bf935aff693f6cb`, 운영 Compose
  설정은 `aa8e032e872daefb436a6abffa0d99df16e535bd`다. 신규 마이그레이션 3개가 적용됐고
  실패 마이그레이션은 0개다.
- `/`, `/signup`, `/terms`, `/privacy`, `/unsubscribe`, `/api/health`, `/api/ready`가
  외부에서 모두 200이며 readiness의 DB·Redis·스토리지·큐·메일 검사가 모두 `ok`다.
- 웹·워커·스케줄러·PostgreSQL·Redis는 모두 healthy다. T0/T1 워커 실행 조건 누락을
  수정했고 Redis 큐 정책은 BullMQ 권고에 맞춰 `noeviction`으로 바꿨다.
- 서버 SMTP는 Resend 대체 TLS 포트 2465로 실제 인증 검증을 통과했다. GHCR pull
  자격증명은 `deploy` 사용자에 권한 600으로 저장돼 있다. 비밀값은 저장소에 없다.
- 자세한 검증 결과와 남은 비출시 항목은
  `HANDOFF_2026-08-27_SIGNUP_CONSENT.md` 및
  `10_TASKS/T17_SIGNUP_CONSENT_COMPLETION.md`를 먼저 읽는다.

## 2026-08-26 공개 랜딩 라우트 기준

- 비회원 공개 랜딩의 정식 경로는 **`/` 하나뿐**이다.
- 검수용·캠페인용 랜딩을 별도 라우트로 복제하지 말고, `/`의
  `GuestLanding` 섹션으로 통합한다.
- 피드 DB·Redis가 잠시 사용 불가능해도 히어로·제품 소개·CTA·푸터는
  계속 렌더링해야 한다. 동적 Coverflow만 데이터가 없으면 생략한다.

## 2026-08-26 광고형 멤버십 연동 기준

- 공개 랜딩 푸터의 **광고형 멤버십** 링크는 `/ads-plan`으로 연결한다.
- `/ads-plan`에서 선택한 `plan=ads-standard`, `lang`, `market`, 이메일은
  회원가입 → 이메일 인증 → 로그인까지 허용 목록으로 검증해 보존한다.
- 인증 또는 로그인 완료 후에는 `/ads-plan?...#join`으로 돌아오며, 외부 URL을
  `next`에 넣을 수 없도록 로컬 경로만 허용한다.
- 현재 구현 범위는 **요금제 안내와 가입 의향 전달**까지다. 결제 승인, 웹훅,
  구독 상태 저장, 변경·해지는 아직 구현되지 않았다. 결제사를 정하고 가맹점 키와
  웹훅 비밀키를 준비하기 전에는 결제 완료나 멤버십 활성화를 구현된 것으로 표시하지 않는다.

## 2026-08-26 크리에이터 모집 경로 기준

- ilog의 브랜드 소개와 세계관을 보여주는 정식 경로는 `/about`이다. Kintaro에서
  참고한 인물 이미지 레일, 번호형 편집 섹션, 움직이는 문장, 작품 프레임 보드와
  로드맵형 구도는 이 About 페이지에만 사용한다.
- 공개 크리에이터 모집·신청의 정식 경로는 `/creator-apply`다. 공개 랜딩 `/`을
  복제한 두 번째 랜딩이 아니라, 모집 안내와 실제 지원 접수를 담당하는 기능 페이지다.
- 지원서는 `POST /api/creator-applications`에서 검증하고 `creator_application`에 저장한다.
  동일 이메일과 모집 라운드의 재제출은 중복 생성하지 않고 최신 내용으로 갱신한다.
- 공개 접수 API는 IP 기준 하루 5회로 제한하며, 개인정보 동의 없이 저장하지 않는다.
- `/creator-apply`는 모집 분야·절차·기준·지원 폼에 집중한다. About의 브랜드 서사를
  이 경로에 다시 복제하지 않는다.

## 2026-08-25 T09/S3 성능 게이트·운영 배포 완료

- 기존 T09 구현에서 빠져 있던 20개 동일 정렬키 커서, `isLiked` 단일 배치 조회,
  1,000건 API p95, 3종 피드 `EXPLAIN ANALYZE` 검증을 추가했다.
- 피드 정렬과 커서 조건을 완전히 지원하도록 episode 인덱스를
  `(status, published_at DESC, id DESC)`와 `(status, rank_score DESC, id DESC)`로 교체했다.
- CI `32847439087`에서 전체 gate, Playwright 27개, Lighthouse와 이미지 게시가 통과했다.
  운영 배포 `32848683658`로 SHA `e2fc74a6a976956e1e7c525bcefd398ad4e57663`을 반영했다.
- 외부 홈·health·ready·popular/latest 피드가 모두 200이고 readiness 의존성도 모두 `ok`다.
- T08·T09는 S3 완료다. 다음 작업은 T10/S3의 남은 팬아웃 2,500명 3배치,
  알림 생성 단일 관문, 낙관 UI 수동 항목을 자동 검증으로 닫는 것이다.

## 2026-08-25 T12/S3 운영 배포 인수인계

- T12 신고·심사·계정 정지 구현과 운영 배포를 완료했다. 신고 자동 우선순위·숨김,
  기각 복원, 대상별 실제 미리보기, 동시 심사 방어, 권한 경계, 감사 로그,
  사용자 정지 시 세션·콘텐츠·진행 업로드 일괄 차단이 포함된다.
- 계정 정지 검증은 서로 다른 브라우저 컨텍스트 2개에 각각 활성 세션을 만든 뒤
  관리자가 사용자를 정지하고 두 요청이 모두 즉시 401이 되는 Playwright 시나리오로
  자동화했다.
- 최종 구현 SHA는 `4be0d3fddee1d41d8fd480534550ecbbcfbd7b9c`이다.
  GitHub Actions `32842735110`에서 gate와 웹·워커 이미지 게시가 모두 통과했고,
  배포 실행 `32843982847`로 동일 SHA를 운영에 반영했다.
- 배포 후 `https://ilog.info/`, `/api/health`, `/api/ready`는 200이며 DB·Redis·스토리지·큐가
  모두 `ok`다. 비인증 `/api/admin/reports`는 401이다. `pnpm sss:remaining`은 `TOTAL=0`이다.
- 모바일은 ISS-018 결정대로 Expo가 아닌 bare React Native CLI 기반의 Android·iOS
  크로스플랫폼 구조를 유지한다. 다음 개발 단계에서도 웹 전용 API를 UI에 직접 결합하지
  말고 공용 core/계약과 플랫폼 어댑터 경계를 지킨다.
- 다음 개발 세션은 `T13 PWA_PHASE2 / S1 Spec 확인`이다.

## 2026-08-25 T11/S3 최신 인수인계

- T11 관측성 자동화 구현을 완료했다. 구조적 로그, HTTP·잡 메트릭, `/api/metrics`,
  readiness 의존성 점검, Prometheus·Alertmanager·Grafana 구성, 알럿 규칙·대시보드 3개,
  로그 로테이션과 관측성 계약 게이트가 포함된다.
- 최초 CI `32827323032`는 Prometheus 이미지의 기본 엔트리포인트에 `promtool`을 인자로
  잘못 전달해 실패했다. `2898e98`에서 `--entrypoint promtool`로 고치고 같은 회귀를
  `contract:observability`가 차단하게 했다.
- 다음 CI에서 모바일 LCP가 2,643ms로 2,500ms 예산을 143ms 초과했다. 예산을 완화하지
  않고 홈 피드 조회를 React Suspense 스트리밍 경계로 분리해 제목을 먼저 페인트하도록
  `d5d26b7`에서 개선했다.
- GitHub Actions `32834309607`의 gate job에서 프로덕션 빌드, L1 정적 검사, L2 계약 검사,
  L3 단위·통합·Playwright 24개, promtool 및 Lighthouse 모바일 예산이 모두 통과했다.
  로컬은 Docker 런타임 부재로 Testcontainers만 실행할 수 없었고, 단위 테스트 1,285개와
  표적 피드 테스트 9개는 통과했다.
- 운영에서 남은 수동 검증은 대시보드 실제 데이터 표시, 알럿 강제 발화·수신, 운영 로그의
  시크릿 0건, requestId의 web→worker 종단 추적이다. 자동화 S3 완료와 별도로 배포 후
  수행해야 하며 완료로 표시하지 않았다.
- 다음 개발 세션은 `T12 MODERATION / S1 Spec 확인`이다. `ISS-017` 권장안이 사용자
  승인되어 `Report.priorityFlag`와 `Report.autoHidden`을 추가하는 방향으로 확정됐다.

## 2026-08-25 T09/S3 배포 인수인계

- T09 피드·랭킹·검색·태그 구현을 완료했다. 인기·최신·팔로잉 피드, 서명 커서,
  차단·좋아요 일괄 처리, Redis 장애 우회, 검색·태그 API, 랭킹 worker/scheduler,
  SSR 첫 페이지와 400px 선행 무한 스크롤, OpenAPI 및 회귀 테스트가 포함된다.
- `NotImplementedError('T09:...')` 잔존 수는 0이며 OpenAPI·Prisma 등 계약 게이트는
  통과했다. 표적 단위·서비스·워커·컴포넌트 테스트 37개도 통과했다.
- 로컬 장비에는 Docker CLI가 없고 자원 고갈 요청이 있어 Testcontainers 전체 통합,
  1,000건 p95 및 Lighthouse 최종 판정은 GitHub Actions/Linux에서 수행한다. 이 결과가
  초록이 되기 전까지 `docs/INDEX.md`의 T09 S3 체크는 완료로 바꾸지 않는다.
- 운영 마스터 계정 `devoh@signpost.kr`은 최고 권한인 `ADMIN`, 활성·이메일 인증 상태이며
  실제 Auth.js 로그인을 확인했다. 비밀번호는 보안상 저장소 문서에 기록하지 않는다.
- 다음 작업은 GitHub Actions 결과와 운영 `/api/health`, `/api/ready`, 마스터 로그인을
  확인한 뒤 T09 S3를 닫고 T10으로 진행하는 것이다.

## 2026-08-25 T08/S3 최신 인수인계

- T08 시리즈·에피소드·공개예약 구현을 완료했다. 상태기계, 슬러그·태그 규칙,
  repository 트랜잭션, REST API, 예약공개 scheduler/worker, 미디어 삭제 잡, 공개·스튜디오
  화면, OpenAPI, US-02·US-08 E2E가 포함된다.
- `pnpm sss:remaining` 결과는 `TOTAL=0`이다. T08 단위·서비스·워커·UI 표적 테스트와
  상태 전이·스케줄러 이중 실행 검증이 모두 통과했다.
- GitHub Actions 실행 `32795187406`에서 Node 22 프로덕션 빌드, Prisma 마이그레이션,
  L1 정적 검사, L2 계약 검사, L3 동작 검사와 Playwright E2E 22개가 모두 통과했다.
- 누적 Prisma 마이그레이션을 허용하면서 각 `migration.sql`의 존재·비어 있지 않음을
  검사하도록 초기 T02 계약 검사기를 확장했다.
- 로컬 Windows에는 Docker CLI가 없고 standalone symlink 권한도 없어 컨테이너 통합
  스위트와 최종 빌드는 Linux CI 결과를 정식 검증 근거로 사용했다.
- T08/S3는 완료됐다. 다음 개발 세션은 한 세션 한 단계 규칙에 따라
  `T09 FEED_RANKING / S1 Spec 확인`부터 시작한다.

## 2026-08-24 T07/S3 최신 인수인계

- 현재 브랜치/원격: `main`, 최신 구현 커밋 `80893c9`까지 `origin/main` 푸시 완료.
- T07 구현: HLS/Safari 재생, 오류 복구, 키보드 컨트롤, 화질 선택, 이어보기, 30초 조회수, 연령 확인 쿠키, 4개 API 라우트, 시청 페이지, OpenAPI, US-03·US-04 E2E 완료.
- 잔존 센티넬: `pnpm sss:remaining` 결과 `TOTAL=0`.
- GitHub Actions Gate 실행 `32703707486`: Node 22 프로덕션 빌드, L1/L2/L3, E2E 20건 모두 PASS. 웹·워커 이미지는 GHCR 빌드/push 성공.
- 첫 실행 `32703249014`는 테스트가 CI의 `NEXT_PUBLIC_CDN_BASE_URL`을 격리하지 않아 실패했고, 구현 문제가 아닌 테스트 환경값을 `80893c9`에서 수정했다.
- 로컬 Windows는 Docker 런타임이 없어 Testcontainers 통합 스위트를 실행할 수 없고, Next standalone 파일 복사는 symlink `EPERM`이 난다. 동일 항목은 Linux CI에서 모두 통과했다.
- 운영 배포 workflow는 수동이며 이번 세션에는 실행하지 않았다. 배포가 필요하면 승인 후 `deploy.yml`에 SHA `80893c997fc154fae47f8ff957386b6475334941`, `deploy_worker=true`로 실행하고 외부 health를 확인한다. 비밀번호·토큰·S3 키는 문서나 채팅에 적지 않는다.
- T07의 자동화 구현은 끝났지만 실제 Chrome/Safari/Firefox/iOS Safari 수동 재생, Safari에서 hls.js 미로드, TTFF/CSP 콘솔 확인은 운영 전 수동 QA 항목으로 남아 있다.
- 다음 개발 세션은 `T08 SERIES_EPISODE / S1 Spec 확인`만 진행한다. 시작 전 `HARNESS.md`, `docs/INDEX.md`, `docs/10_TASKS/T08_SERIES_EPISODE.md`를 읽고 한 세션 한 단계 규칙을 지킨다.

---

## 1. 지금 어디까지 왔나

| 태스크 | 상태 |
|---|---|
| T00 부트스트랩 · T01 인프라 · T02 DB · T03 인증 · T04 스토리지 · T14 디자인시스템 | **완료** |
| T05 업로드 | S1·S2 완료, **S3 진행 중 — 잔존 마커 6** |
| T06~T13 | 미착수 |

숫자로 보면:

- API 엔드포인트 **9 / 50** (계약 기준)
- 화면 **4 / 16** (`/`, `/login`, `/signup`, `/verify`)
- Prisma 모델 **20 / 20** — 도메인 스키마는 전부 서 있다
- UI 프리미티브 **21 / 21** (08_UIUX §6 목록과 일치)
- 테스트 876 (단위) + 통합·E2E 는 CI

엔드포인트로는 18%지만 **되돌리기 어려운 결정은 대부분 끝났다.** 하네스(3층
게이트 · 계약 검사 9종), 전체 스키마, 인증·세션·권한, `withRoute`, 스토리지
계층이 서 있다. 남은 서버 작업은 기존 스키마 위에 서비스와 라우트를 얹는 일이다.

예외는 **T06 트랜스코드 워커** — `apps/worker` 디렉터리조차 없고 ffmpeg
파이프라인이라 성격이 다르다. 남은 것 중 가장 무겁다.

---

## 2. 바로 다음에 할 일

### T05/S3 잔존 마커 6개

```
pnpm sss:remaining        # T05: 6
```

| 마커 | 파일 | 내용 |
|---|---|---|
| `T05:useUpload` | `apps/web/src/hooks/use-upload.ts` | 상태기계 + 병렬 3 |
| `T05:uploadPart` | 같은 파일 | **XHR 로 PUT** (fetch 는 업로드 진행률을 못 준다) |
| `T05:resumeUpload` | 같은 파일 | localStorage 복원 + 서버 상태 대조 |
| `T05:pollTranscode` | 같은 파일 | 자산 상태 폴링 |

그다음 S3 목록의 나머지 (마커 없음, 새 파일):

- `apps/web/app/api/uploads/**` 라우트 5개
- `apps/web/src/components/upload/Uploader.tsx`, `UploadProgress.tsx`
- `apps/web/app/(studio)/studio/upload/page.tsx`
- `apps/web/e2e/upload-flow.e2e.ts` (US-02, US-09)

**라우트를 쓸 때 주의**: 업로드 생성 라우트의 레이트리밋은 티어 의존이다.
`RouteRateLimit.limit` 이 함수도 받도록 넓혀 두었다.

```ts
rateLimit: {
  bucket: 'uploads',
  limit: (capacity) => capacity.uploadHourlyCount,  // T0 = 5
  windowSec: 3600,
  by: 'user',
}
```

---

## 3. 사람이 결정해야 하는 것 (미결)

`_ISSUES.md` 에 전부 있다. 코드는 막히지 않지만 **스펙 문구가 실물과 어긋난
상태로 남아 있다.** 스펙은 불변이라 손대지 않았다.

| 번호 | 무엇 | 지금 코드는 |
|---|---|---|
| **ISS-006** | `07_AUTH_SECURITY` §1 이 `strategy: 'database'` 를 명시하지만 Auth.js 가 Credentials 와 함께 쓰면 **설정 자체를 거부**한다 | `'jwt'` + `jwt.encode` 브리지. 실질(DB 세션·즉시 취소)은 유지 |
| **ISS-009** | `05_API_CONTRACT` §10 은 업로드 20회/1시간·50GB/1일, `11_CAPACITY_TIERS` 는 T0 에서 5회·10GiB | capacity 를 따른다 (더 엄격한 쪽) |
| **ISS-010** | `00_PRODUCT.md` 는 **AIDREAM**, 도메인과 부트스트랩 페이지는 **iLOG** | AIDREAM. `messages/ko.ts` 의 `brand.name` 한 곳만 고치면 바뀐다 |

---

## 4. 배포 — 여기까지 되어 있다

`ISS-008` 참조. 세 칸 중 둘이 채워졌다.

| 칸 | 상태 |
|---|---|
| 이미지 빌드·push | **완료** — `gate.yml` 의 `image` 잡. `needs: gate` 로 "게이트 통과가 배포 조건" 을 구조로 만들었다. 태그는 커밋 SHA, `latest` 없음 |
| 배포 절차 | **완료** — `scripts/ops/deploy.sh` (pull → 마이그레이션 → 워커 → 웹 → 헬스 → 실패 시 자동 롤백) |
| 서버 적용 | **미완료** — 아래 |

### 서버에서 한 번만

```bash
curl -fsSLO https://raw.githubusercontent.com/yoo9857/dreamcine/main/scripts/ops/prepare-deploy.sh
bash prepare-deploy.sh
```

`deploy` 계정·공개키·docker 그룹·`BOOTSTRAP_MODE=false` 를 한 번에 처리하고,
GitHub Secrets 에 넣을 값을 출력한다. 멱등이라 두 번 실행해도 안전하다.

### GitHub Secrets

`DEPLOY_HOST` `DEPLOY_USER` `DEPLOY_PATH` `DEPLOY_SSH_KEY` `DEPLOY_KNOWN_HOSTS`
(선택 `DEPLOY_DOMAIN`). 그 뒤 Actions → **deploy** 워크플로를 SHA 와 함께
수동 실행한다.

자동 배포로 만들지 않은 이유: `O01_DEPLOY` §3-0 이 "정상이 아닌 상태에서
배포하지 않는다" 를 못박고 있고 그 판단은 사람이 한다.

### 배포 전 반드시 확인

- **부트스트랩을 끄면 `/` 가 앱으로 넘어간다.** Caddy 의 부트스트랩 분기가
  `/api/*` 를 뺀 전부를 가로채므로 앱과 공존할 수 없다.
- 그래서 임시 홈 `app/(main)/page.tsx` 를 만들어 두었다. **가짜 피드가 아니라
  정직한 비어있음 상태다.** T09 가 피드로 교체한다.
- 아직 없는 것: 상단바·사이드바·모바일 하단탭 (08_UIUX §2). **어느 태스크도
  소유하지 않는다.** T09 가 화면을 만들 때 같이 세우거나, 그 전에 별도로
  세워야 한다. 지금은 `(studio)` 레이아웃만 있다.

---

## 5. 이 프로젝트에서 반복해서 드러난 것

새로 들어오는 사람이 같은 함정에 빠지지 않도록 적는다. 전부 실제로 겪었다.

### 초록을 증명으로 읽지 않는다

게이트가 초록인데 로그인이 완전히 죽어 있던 적이 있다(ISS-006). 테스트가
스펙의 **문구**를 단정하고 있었기 때문이다 —
`expect(config.session.strategy).toBe('database')`. 확인해야 할 것은 문구가
아니라 "라이브러리가 이 설정을 받아들이는가" 였다.

### 스펙이 "린트로 막아라" 라고 하면 진짜로 막는다

`06_MEDIA_PIPELINE` §5 의 CDN 단일 지점 규칙을 린트로 걸자마자 **실제 위반이
나왔다** — `get-me.ts` 가 자기만의 `avatarUrl` 로 CDN URL 을 손으로 조립하고
있었다. 규칙을 켜기 전까지 아무도 몰랐다.

### 발동하지 않는 가드는 없는 것보다 나쁘다

depcruise 규칙을 만들고 통과해서 안심했는데, 되돌려도 통과했다(OBS-016).
코어 모듈이 `node:` 접두사 없이 그래프에 들어오고, 워크스페이스 패키지는
`doNotFollow: node_modules` 때문에 전이 추적이 아예 안 됐다. **가드를 만들면
반드시 되돌려서 실패하는지 확인한다.** 이 저장소의 모든 가드는 그렇게 확인했다.

### 검사가 있어도 실행되지 않으면 없는 것이다

`verify-infra.sh` 가 CORS `ExposeHeaders: ETag` 를 단정하고 있었지만 어느
워크플로도 그 스크립트를 부르지 않았다(OBS-017). 10_NFR §8 이 요구하는
커버리지 대상 중 절반이 vitest 설정에 없었다(OBS-014). 스펙이 요구하는데
게이트가 재지 않는 것을 발견하면 **연결하는 것이 먼저다.**

### 합의된 지연 상태를 게이트가 막으면 안 된다

Docker `COPY` 소스 전수 검사를 넣으려다 말았다 — `apps/worker` 가 아직 없어
즉시 실패하는데, 그것은 ISS-004 로 이미 합의된 상태다. 합의된 상태를 게이트가
막으면 사람이 게이트를 끄고 싶어진다. 그런 검사는 해당 코드가 생기는 태스크에서
함께 넣는다.

### 이스케이프

Bash heredoc 과 Python 힙 문서를 거치면 `\\` 가 `\` 로, `\\uXXXX` 가 실제
문자로 바뀐다. 정규식·백슬래시가 든 파일은 **Write 도구로 직접 쓰거나**
`chr(92)` 로 조립한다. 이것 때문에 여러 번 깨졌다.

---

## 6. 실행 요약

```bash
pnpm gate:s2          # L1 정적 (lint · tsc -b · depcruise · e2e:collect · prettier)
pnpm gate:contract    # L2 계약 (openapi·prisma·errors·limits·deps·capacity·proxy·tokens)
pnpm gate             # 3층 전부 (L3 은 Docker 필요)
pnpm sss:remaining    # 잔존 NotImplementedError 마커
```

로컬(Windows)에서 안 되는 것:

- **Docker 없음** → 통합·E2E 는 CI 가 유일한 검증자다 (ISS-005)
- **standalone 빌드** → 심볼릭 링크 권한(EPERM)으로 실패. 컴파일까지는 된다
- 그래서 `pnpm vitest run --exclude '**/*.integration.test.ts'` 로 돌리면
  db·services 커버리지 임계값이 로컬에서만 실패한다. **정상이다**

CI 는 `.github/workflows/gate.yml` 하나에 gate → image 순으로 들어 있다.
실패 원인은 **annotation 에 실려 있다** — 워크플로 로그 다운로드는 관리자
권한이 필요하므로 그렇게 만들어 두었다.

---

## 2026-08-23 운영 확인

- GitHub `origin/main` 최신 커밋: `e5f74d8` (`T05/S3: 인수인계 문서`)
- 서버 `/opt/dreamcine` 커밋: `46fbef7` — 최신 커밋 미배포
- 서버 운영 `.env`: 미존재 (`.env.example`만 존재)
- `CDN_BASE_URL`: 운영값 미설정
- 실행 컨테이너: `aidream-caddy-1`만 실행 중
- 결론: Git push는 완료됐으나 운영 배포는 환경변수 준비 후 진행 필요
