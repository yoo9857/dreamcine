# 인수인계 — 2026-08-22

이어받는 사람이 **먼저 읽어야 할 한 장**이다.
전체 규칙은 `HARNESS.md`, 미해결 항목은 `_ISSUES.md`, 순서는 `INDEX.md`.

## 2026-08-25 T08/S3 최신 인수인계

- T08 시리즈·에피소드·공개예약 구현을 완료했다. 상태기계, 슬러그·태그 규칙,
  repository 트랜잭션, REST API, 예약공개 scheduler/worker, 미디어 삭제 잡, 공개·스튜디오
  화면, OpenAPI, US-02·US-08 E2E가 포함된다.
- `pnpm sss:remaining` 결과는 `TOTAL=0`이다. T08 단위·서비스·워커·UI 표적 테스트
  78개가 통과했고 전체 비컨테이너 테스트 1,145개도 통과했다.
- `gate:static`과 `gate:contract`는 통과했다. 누적 Prisma 마이그레이션을 허용하면서 각
  `migration.sql`의 존재·비어 있지 않음을 검사하도록 초기 T02 계약 검사기를 확장했다.
- 로컬 Windows에는 Docker CLI가 없어 Testcontainers DB 스위트 6개와 Playwright E2E를
  실행하지 못했다. `gate:test`에서 제품 테스트 1,164개는 통과했고 실패 원인은 모두
  `Could not find a working container runtime strategy`였다.
- Next 프로덕션 빌드는 컴파일·타입검사·정적 페이지 17개 생성까지 성공했으나, 기존에
  알려진 Windows standalone symlink `EPERM`으로 파일 추적 복사 단계에서 실패했다.
- 다음 작업은 Node 22 + Docker가 있는 Linux CI에서 `pnpm gate:s3`를 실행해 L3와
  US-02·US-08을 확인하는 것이다. 성공하면 T08 문서의 S3를 체크하고 `pnpm sss:status`로
  `docs/INDEX.md`를 갱신한 뒤 T09/S1로 이동한다.

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
